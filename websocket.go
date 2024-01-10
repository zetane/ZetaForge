package main

import (
	"errors"
	"log"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/gorilla/websocket"
)

const writeWait = 10 * time.Second
const pongWait = 60 * time.Second
const pingPeriod = (pongWait * 9) / 10

type Client struct {
    RoomId string
    Conn *websocket.Conn
    ToSend chan Message
    Hub *Hub
}

func (client *Client) Receive() {
    client.Conn.SetReadLimit(512)
    client.Conn.SetReadDeadline(time.Now().Add(pongWait))
    client.Conn.SetPongHandler(func(string) error {
        client.Conn.SetReadDeadline(time.Now().Add(pongWait))
        return nil
    })

    defer func() {
        client.Hub.Unregister <- client
        client.Conn.Close()
    }()

    for {
        var msg Message
        if err := client.Conn.ReadJSON(&msg); err != nil {
            if websocket.IsUnexpectedCloseError(err, websocket.CloseNormalClosure, websocket.CloseGoingAway) {
                log.Printf("Read error: %v", err)
            }
            return
        }
        msg.RoomId = client.RoomId
        client.Hub.Broadcast <- msg
    }
}

func (client *Client) Send() {
    ticker := time.NewTicker(pingPeriod)

    defer func() {
        ticker.Stop()
        client.Conn.Close()
    }()

    for {
        select {
        case msg, ok := <-client.ToSend:
            client.Conn.SetWriteDeadline(time.Now().Add(writeWait))
            if !ok {
                client.Conn.WriteMessage(websocket.CloseMessage, []byte{})
                return
            } else {
                msg.RoomId = ""
                if err := client.Conn.WriteJSON(msg); err != nil {
                    if websocket.IsUnexpectedCloseError(err, websocket.CloseNormalClosure, websocket.CloseGoingAway) {
                        log.Printf("Write error: %v", err)
                    }
                    return
                }
            }
        case <-ticker.C:
            client.Conn.SetWriteDeadline(time.Now().Add(writeWait))
            if err := client.Conn.WriteMessage(websocket.PingMessage, nil); err != nil {
                if websocket.IsUnexpectedCloseError(err, websocket.CloseNormalClosure, websocket.CloseGoingAway) {
                    log.Printf("Ping error: %v", err)
                }
                return
            }
        }
    }
}

type Message struct {
    RoomId string `json:"id,omitempty"`
    Content string `json:"content"`
}

type Hub struct {
    Clients map[string]map[*Client]bool
    Register chan *Client
    Unregister chan *Client
    Broadcast chan Message
}

func newHub() *Hub {
    return &Hub{
        Clients: make(map[string]map[*Client]bool),
        Register: make(chan *Client),
        Unregister: make(chan *Client),
        Broadcast: make(chan Message),
    }
}

func (hub *Hub) Run() {
    for {
        select {
        case client := <-hub.Register:
            hub.Clients[client.RoomId][client] = true
        case client := <-hub.Unregister:
            if _, ok := hub.Clients[client.RoomId]; ok {
                delete(hub.Clients[client.RoomId], client)
                close(client.ToSend)
            }
        case message := <-hub.Broadcast:
            for client := range hub.Clients[message.RoomId] {
                select {
                case client.ToSend <- message:
                default:
                    delete(hub.Clients[client.RoomId], client)
                    close(client.ToSend)
                }
            }
        }
    }
}

func (hub *Hub) CloseRoom(roomId string) {
    if _, ok := hub.Clients[roomId]; ok {
        for client := range hub.Clients[roomId] {
            close(client.ToSend)
        }
        delete(hub.Clients, roomId)
    }
}

func serveSocket(ctx *gin.Context, roomId string, hub *Hub) error {
    if _, ok := hub.Clients[roomId]; !ok { // if does not exist
        return errors.New("room " + roomId + " does not exist")
    }

    upgrader := websocket.Upgrader {
        ReadBufferSize: 1024,
        WriteBufferSize: 1024,
    }

    conn, err := upgrader.Upgrade(ctx.Writer, ctx.Request, nil)
    if err != nil {
        return err
    }

    client := &Client{
        RoomId: roomId,
        Conn: conn,
        ToSend: make(chan Message, 256),
        Hub: hub,
    }

    hub.Register <- client
    go client.Receive()
    go client.Send()
    return nil
}
