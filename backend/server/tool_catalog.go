package server

import (
	"encoding/json"
	"fmt"
	"os"
	"path/filepath"
	"sort"
	"strings"
)

type toolCatalogFile struct {
	Tools []toolCatalogEntry `json:"tools"`
}

type toolCatalogEntry struct {
	Name        string             `json:"name"`
	Description string             `json:"description"`
	Parameters  []toolCatalogParam `json:"parameters"`
}

type toolCatalogParam struct {
	Name        string `json:"name"`
	Type        string `json:"type"`
	Required    bool   `json:"required"`
	Description string `json:"description,omitempty"`
}

type normalizedToolCatalog struct {
	Tools     []normalizedTool          `json:"tools"`
	ToolNames []string                  `json:"tool_names"`
	ByName    map[string]normalizedTool `json:"by_name"`
}

type normalizedTool struct {
	Name           string             `json:"name"`
	Description    string             `json:"description"`
	RequiredParams []string           `json:"required_params"`
	AllParams      []string           `json:"all_params"`
	Parameters     []toolCatalogParam `json:"parameters"`
}

func loadNormalizedToolCatalog() (normalizedToolCatalog, error) {
	toolPathCandidates := []string{
		filepath.Join("configs", "tools.json"),
		filepath.Join("..", "configs", "tools.json"),
		filepath.Join("..", "..", "configs", "tools.json"),
	}

	var (
		raw      []byte
		err      error
		toolPath string
	)
	for _, candidate := range toolPathCandidates {
		raw, err = os.ReadFile(candidate)
		if err == nil {
			toolPath = candidate
			break
		}
	}
	if err != nil {
		return normalizedToolCatalog{}, fmt.Errorf("read configs/tools.json: %w", err)
	}

	var parsed toolCatalogFile
	if err := json.Unmarshal(raw, &parsed); err != nil {
		return normalizedToolCatalog{}, fmt.Errorf("decode %s: %w", toolPath, err)
	}

	catalog := normalizedToolCatalog{
		Tools:     make([]normalizedTool, 0, len(parsed.Tools)),
		ToolNames: make([]string, 0, len(parsed.Tools)),
		ByName:    map[string]normalizedTool{},
	}

	for _, entry := range parsed.Tools {
		name := strings.TrimSpace(entry.Name)
		if name == "" {
			continue
		}

		required := make([]string, 0, len(entry.Parameters))
		all := make([]string, 0, len(entry.Parameters))
		for _, parameter := range entry.Parameters {
			paramName := strings.TrimSpace(parameter.Name)
			if paramName == "" {
				continue
			}
			all = append(all, paramName)
			if parameter.Required {
				required = append(required, paramName)
			}
		}

		tool := normalizedTool{
			Name:           name,
			Description:    strings.TrimSpace(entry.Description),
			RequiredParams: required,
			AllParams:      all,
			Parameters:     entry.Parameters,
		}

		catalog.Tools = append(catalog.Tools, tool)
		catalog.ToolNames = append(catalog.ToolNames, name)
		catalog.ByName[name] = tool
	}

	sort.Strings(catalog.ToolNames)
	sort.Slice(catalog.Tools, func(i, j int) bool {
		return catalog.Tools[i].Name < catalog.Tools[j].Name
	})

	return catalog, nil
}
