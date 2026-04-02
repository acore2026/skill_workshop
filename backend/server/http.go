package server

import (
	"encoding/json"
	"net/http"
	"strings"
	"sync"

	"github.com/google/uuid"
	"github.com/gorilla/websocket"
)

type APIServer struct {
	cfg          Config
	orchestrator AgentOrchestrator
	upgrader     websocket.Upgrader
}

func NewAPIServer(cfg Config, orchestrator AgentOrchestrator) *APIServer {
	return &APIServer{
		cfg:          cfg,
		orchestrator: orchestrator,
		upgrader: websocket.Upgrader{
			CheckOrigin: func(r *http.Request) bool {
				return originAllowed(r.Header.Get("Origin"), cfg.AllowedOrigins)
			},
		},
	}
}

func (s *APIServer) Handler() http.Handler {
	mux := http.NewServeMux()
	mux.HandleFunc("/api/health", s.handleHealth)
	mux.HandleFunc("/api/tools", s.handleTools)
	mux.HandleFunc("/ws/agent-run", s.handleAgentRun)
	return mux
}

func (s *APIServer) handleHealth(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.Error(w, http.StatusText(http.StatusMethodNotAllowed), http.StatusMethodNotAllowed)
		return
	}

	writeCORS(w, r, s.cfg.AllowedOrigins)
	w.Header().Set("Content-Type", "application/json; charset=utf-8")
	_ = json.NewEncoder(w).Encode(map[string]bool{"ok": true})
}

func (s *APIServer) handleTools(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.Error(w, http.StatusText(http.StatusMethodNotAllowed), http.StatusMethodNotAllowed)
		return
	}

	writeCORS(w, r, s.cfg.AllowedOrigins)
	catalog, err := loadNormalizedToolCatalog()
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	w.Header().Set("Content-Type", "application/json; charset=utf-8")
	_ = json.NewEncoder(w).Encode(catalog)
}

func (s *APIServer) handleAgentRun(w http.ResponseWriter, r *http.Request) {
	if r.Method == http.MethodOptions {
		writeCORS(w, r, s.cfg.AllowedOrigins)
		w.WriteHeader(http.StatusNoContent)
		return
	}
	if r.Method != http.MethodGet {
		http.Error(w, http.StatusText(http.StatusMethodNotAllowed), http.StatusMethodNotAllowed)
		return
	}

	conn, err := s.upgrader.Upgrade(w, r, nil)
	if err != nil {
		return
	}
	defer conn.Close()

	var start StartRunRequest
	if err := conn.ReadJSON(&start); err != nil {
		_ = conn.WriteJSON(NewEvent("", "run_error", map[string]any{
			"message": "Failed to read run request.",
			"detail":  err.Error(),
		}))
		return
	}
	if start.Type != "start_run" {
		_ = conn.WriteJSON(NewEvent(start.RunID, "run_error", map[string]any{
			"message": "First socket message must be start_run.",
		}))
		return
	}
	if strings.TrimSpace(start.RunID) == "" {
		start.RunID = uuid.NewString()
	}
	if len(start.Messages) == 0 {
		_ = conn.WriteJSON(NewEvent(start.RunID, "run_error", map[string]any{
			"message": "Run request must include at least one message.",
		}))
		return
	}

	var writeMu sync.Mutex
	emit := func(event StreamEvent) error {
		writeMu.Lock()
		defer writeMu.Unlock()
		return conn.WriteJSON(event)
	}

	if err := s.orchestrator.Run(r.Context(), start, emit); err != nil {
		_ = conn.WriteJSON(NewEvent(start.RunID, "run_error", map[string]any{
			"message": "Agent run failed.",
			"detail":  err.Error(),
		}))
	}
}

func originAllowed(origin string, allowedOrigins []string) bool {
	if len(allowedOrigins) == 0 || origin == "" {
		return true
	}
	for _, candidate := range allowedOrigins {
		if candidate == "*" || strings.EqualFold(candidate, origin) {
			return true
		}
	}
	return false
}

func writeCORS(w http.ResponseWriter, r *http.Request, allowedOrigins []string) {
	origin := r.Header.Get("Origin")
	if len(allowedOrigins) == 0 {
		if origin == "" {
			w.Header().Set("Access-Control-Allow-Origin", "*")
		} else {
			w.Header().Set("Access-Control-Allow-Origin", origin)
			w.Header().Set("Vary", "Origin")
		}
	} else if originAllowed(origin, allowedOrigins) {
		w.Header().Set("Access-Control-Allow-Origin", origin)
		w.Header().Set("Vary", "Origin")
	}
	w.Header().Set("Access-Control-Allow-Methods", "GET, OPTIONS")
	w.Header().Set("Access-Control-Allow-Headers", "content-type, authorization")
}
