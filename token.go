package main

import (
	"crypto"
	"errors"
	"log"
	"net/http"
	"os"
	"path/filepath"
	"strings"

	"github.com/gin-gonic/gin"
	jwt "github.com/golang-jwt/jwt/v5"
)

func loadCertificates(folder string) (map[string]crypto.PublicKey, error) {
	certificates := make(map[string]crypto.PublicKey)
	files, err := os.ReadDir(folder)
	if err != nil {
		return certificates, err
	}
	for _, file := range files {
		name := file.Name()
		pemRaw, err := os.ReadFile(filepath.Join(folder, name))
		if err != nil {
			log.Printf("Could not read cert; err=%v", err)
			continue
		}

		ecdsaKey, err := jwt.ParseEdPublicKeyFromPEM(pemRaw)
		if err != nil {
			log.Printf("Could not parse public key; err=%v", err)
			continue
		}

		certificates[strings.TrimSuffix(name, filepath.Ext(name))] = ecdsaKey
	}

	return certificates, nil
}

func validateToken(ctx *gin.Context, folder string) (int, string) {
	certs, err := loadCertificates(folder)
	if err != nil {
		log.Printf("Could not load certificates")
		return http.StatusUnauthorized, ""
	}
	bearer := ctx.Request.Header.Get("Authorization")
	if len(strings.Fields(bearer)) != 2 {
		log.Printf("Invalid authorization header")
		return http.StatusUnauthorized, ""
	}
	token, err := jwt.Parse(strings.Fields(bearer)[1], func(t *jwt.Token) (interface{}, error) {
		sub, err := t.Claims.GetSubject()
		if err != nil {
			return "", err
		}
		key, ok := certs[sub]
		if !ok {
			return "", errors.New("Subject certificate missing")
		}

		return key, nil
	}, jwt.WithValidMethods([]string{"EdDSA"}))

	if err != nil {
		log.Printf(err.Error())
		return http.StatusUnauthorized, ""
	}
	sub, _ := token.Claims.GetSubject()
	return http.StatusOK, sub
}
