## 1. Backend API foundation

- [ ] 1.1 Create a backend service endpoint for chat completion requests that accepts a user message and optional current skill YAML.
- [ ] 1.2 Define and document the request/response contract for assistant text, optional skill YAML, and error payloads.
- [ ] 1.3 Integrate the backend endpoint with a real chat-completion provider and add configuration for local development.

## 2. YAML document model and adapters

- [ ] 2.1 Define the product YAML schema for skill documents and align it with the frontend editor model.
- [ ] 2.2 Implement frontend parsing from YAML into the editable workspace document structure.
- [ ] 2.3 Implement frontend serialization from the editable workspace document structure back to YAML.
- [ ] 2.4 Add validation and error handling for malformed or schema-invalid YAML payloads.

## 3. Frontend chat and editor integration

- [ ] 3.1 Replace the local mock generation path in the chat panel and store with backend API calls.
- [ ] 3.2 Render assistant messages from backend responses and preserve chat behavior when no YAML document is returned.
- [ ] 3.3 Extract returned YAML skill documents, load them into the workspace, and preserve the current document when extraction fails.
- [ ] 3.4 Send the current edited YAML document as context on follow-up prompts.

## 4. Product boundary cleanup

- [ ] 4.1 Remove or clearly demote prototype-only generation and execution flows that no longer represent the main product path.
- [ ] 4.2 Update workspace state and UI copy to reflect backend-generated chat plus frontend-owned editing.
- [ ] 4.3 Verify the end-to-end workflow from empty state to generated YAML to local editing to iterative refinement.
