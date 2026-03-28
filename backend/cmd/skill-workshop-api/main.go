package main

import (
	"log"

	"skill-workshop/server"
)

func main() {
	if err := server.RunMain(); err != nil {
		log.Fatal(err)
	}
}
