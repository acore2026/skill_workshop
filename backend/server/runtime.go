package server

import (
	"context"
	"errors"
	"log"
	"net/http"
	"strconv"
)

func (s *APIServer) Start(ctx context.Context) error {
	httpServer := &http.Server{
		Addr:    ":" + strconv.Itoa(s.cfg.Port),
		Handler: s.Handler(),
	}
	go func() {
		<-ctx.Done()
		_ = httpServer.Shutdown(context.Background())
	}()
	log.Printf("Skill Workshop API listening on http://0.0.0.0:%d", s.cfg.Port)
	return httpServer.ListenAndServe()
}

func RunMain() error {
	cfg, err := LoadConfig()
	if err != nil {
		return err
	}

	orchestrator, err := NewADKOrchestrator(context.Background(), cfg)
	if err != nil {
		return err
	}

	server := NewAPIServer(cfg, orchestrator)
	err = server.Start(context.Background())
	if err != nil && !errors.Is(err, http.ErrServerClosed) {
		return err
	}
	return nil
}
