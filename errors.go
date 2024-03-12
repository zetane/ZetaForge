package main

import (
	"net/http"
)

type HTTPError interface {
	error
	Status() int
}

type InternalServerError struct {
	Content string
}

func (err InternalServerError) Status() int {
	return http.StatusInternalServerError
}

func (err InternalServerError) Error() string {
	return err.Content
}

type BadRequest struct {
	Content string
}

func (err BadRequest) Status() int {
	return http.StatusBadRequest
}

func (err BadRequest) Error() string {
	return err.Content
}
