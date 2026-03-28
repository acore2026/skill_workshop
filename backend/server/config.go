package server

import (
	"fmt"
	"os"
	"strconv"
	"strings"
)

type Config struct {
	Port           int
	AppName        string
	LLMAPIKey      string
	LLMBaseURL     string
	LLMModel       string
	AllowedOrigins []string
}

func LoadConfig() (Config, error) {
	loadLocalEnvFile(".env.backend")

	port := 8082
	if raw := strings.TrimSpace(os.Getenv("API_PORT")); raw != "" {
		parsed, err := strconv.Atoi(raw)
		if err != nil || parsed <= 0 {
			return Config{}, fmt.Errorf("API_PORT must be a positive integer")
		}
		port = parsed
	}

	appName := strings.TrimSpace(os.Getenv("APP_NAME"))
	if appName == "" {
		appName = "skill-workshop"
	}

	model := strings.TrimSpace(os.Getenv("LLM_MODEL"))
	if model == "" {
		model = "kimi-k2.5"
	}

	baseURL := strings.TrimSpace(os.Getenv("LLM_BASE_URL"))
	if baseURL == "" {
		baseURL = "https://api.moonshot.cn/v1"
	}

	apiKey := strings.TrimSpace(os.Getenv("LLM_API_KEY"))
	if apiKey == "" {
		apiKey = strings.TrimSpace(os.Getenv("OPENAI_API_KEY"))
	}
	if apiKey == "" {
		return Config{}, fmt.Errorf("missing required environment variable: LLM_API_KEY")
	}

	var allowedOrigins []string
	if raw := strings.TrimSpace(os.Getenv("ALLOWED_ORIGINS")); raw != "" {
		for _, origin := range strings.Split(raw, ",") {
			trimmed := strings.TrimSpace(origin)
			if trimmed != "" {
				allowedOrigins = append(allowedOrigins, trimmed)
			}
		}
	}

	return Config{
		Port:           port,
		AppName:        appName,
		LLMAPIKey:      apiKey,
		LLMBaseURL:     baseURL,
		LLMModel:       model,
		AllowedOrigins: allowedOrigins,
	}, nil
}
