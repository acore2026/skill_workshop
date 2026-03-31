## Core idea
Split generation into two LLM stages plus one rule-based validator:
1. **Planner**
    - converts the user prompt and tool catalog into a compact internal plan
    - identifies the likely tool sequence, gates, semantic dependencies, abort conditions, and completion state
    - outputs a structured intermediate representation in **YAML**
2. **Composer**
    - converts the planner output into the final markdown skill document
    - preserves the planner’s sequence and logic exactly
    - renders the workflow in a **machine-friendly YAML block**, not pseudocode
3. **Validator**
    - mostly rule-based, not agent-based
    - checks structure, tool grounding, ordering, and continuity
    - triggers targeted repair only when needed
This gives much more control than a single “prompt in, markdown out” flow, while keeping the system simple.
---
## Recommended architecture
### 1. Input normalizer
This is a deterministic preprocessing step, not an agent.
Takes:
- raw user prompt
- tool JSON
Produces:
- normalized prompt
- canonical tool index
Example tool index:
```json
{
  "by_name": {
    "Subscription_tool": {
      "description": "...",
      "required_params": ["ue_id", "service_type"],
      "all_params": ["ue_id", "service_type"]
    }
  },
  "tool_names": ["Subscription_tool"]
}
```
Purpose:
- strip formatting noise
- normalize tool names
- extract parameter metadata
- build a searchable catalog for planning and validation
---
### 2. Planner
This is the main reasoning agent.
Input:
- normalized user prompt
- canonical tool index
- planning rules
Output:
- a structured internal plan in YAML
The planner is responsible for:
- understanding the task
- selecting relevant tools
- assigning tool roles
- inferring the minimal valid call sequence
- identifying gates and abort conditions
- identifying semantic continuity requirements
- defining final success/failure states
The planner should not:
- write the final markdown document
- do parameter wiring
- invent tools
- invent extra branches or retries unless clearly justified
---
### 3. Composer
This is the formatting agent.
Input:
- planner YAML
- markdown template
Output:
- final markdown skill document
The composer is responsible for:
- rendering the final markdown structure
- preserving the planner logic exactly
- generating a concise tool inventory
- embedding the workflow as a YAML block
- translating dependencies into human-readable critical rules
The composer should not:
- change sequence
- add tools
- infer new conditions
- add parameter wiring
---
### 4. Validator
This should be mostly rule-based.
Checks:
- required markdown sections exist
- front matter exists
- all tool names exist in the tool catalog
- tool inventory and workflow are consistent
- workflow order matches the planner output
- abort paths are terminal
- completion state exists
- continuity constraints are preserved in the rules/prose
Typical errors:
- unknown tool appears
- validate step appears before issue step
- session creation appears before subnet creation
- workflow omits a selected tool
- tool inventory and workflow disagree
- critical continuity rule is missing
If validation fails, run a small repair step against either:
- the planner output, if the workflow logic is wrong
- the composer output, if formatting or wording is wrong
---
## Planning logic
The planner should apply deterministic heuristics before using open-ended reasoning.
### Sequence heuristics
- tools with descriptions like `validate`, `check`, or `verify` are usually **gates**
- tools with descriptions like `create`, `allocate`, `provision`, or `update context` are usually **preparatory**
- a token issuance step must come before token validation
- a session establishment step should come after prerequisite checks and authorization
- if tool B depends on a resource created by tool A, then A must come first
- prefer the shortest valid chain that satisfies the request
### Continuity heuristics
Even without explicit parameter wiring, the planner should still infer continuity rules such as:
- the same agent must be referenced across related access-control and session-establishment steps
- the same subnet must be referenced across context creation, token issuance, token validation, and PDU session creation
- the same service scope should remain consistent across the flow when implied
---
## Best internal representation
Use a compact YAML IR between planning and composition.
Example:
```yaml
meta:
  name: ACN
  description: Process of connecting embodied agents to the network.
goal:
  user_intent: connect embodied agent to collaborative subnet
  success_condition: subnet access established
tools:
  - name: Subscription_tool
    role: gate
    purpose: check service eligibility
  - name: Create_Or_Update_Subnet_Context_tool
    role: provision
    purpose: create or update subnet context
  - name: Issue_Access_Token_tool
    role: issue
    purpose: issue access token for the target agent
  - name: Validate_Access_Token_tool
    role: gate
    purpose: validate the access token
  - name: Create_Subnet_PDUSession_tool
    role: finalize
    purpose: establish subnet PDU session
workflow:
  - call: Subscription_tool
  - abort_if: Subscription_tool fails
  - call: Create_Or_Update_Subnet_Context_tool
  - abort_if: Create_Or_Update_Subnet_Context_tool fails
  - call: Issue_Access_Token_tool
  - call: Validate_Access_Token_tool
  - abort_if: Validate_Access_Token_tool fails
  - call: Create_Subnet_PDUSession_tool
  - done: DONE
continuity_rules:
  - The same subnet must be used across subnet creation, token issuance, token validation, and PDU session creation.
  - The same target agent must be used across token issuance, token validation, and PDU session creation.
critical_rules:
  - Do not skip any step.
  - Do not establish the PDU session before token validation succeeds.
completion:
  success: DONE
  failure: ABORT
```
This IR is simple, machine-friendly, and easy for the composer and validator to consume.
---
## Final markdown shape
The composer should render this exact structure:
````markdown
---
name: ...
description: ...
---
# ... Skill
## Overview
...
## Tool Inventory
...
## Workflow
```yaml
...
````
## Critical Rules
...
## Output Format
...
````
The `## Workflow` section should use YAML, not pseudocode.
Example rendered workflow block:
```yaml
workflow:
  - call: Subscription_tool
  - abort_if: Subscription_tool fails
  - call: Create_Or_Update_Subnet_Context_tool
  - abort_if: Create_Or_Update_Subnet_Context_tool fails
  - call: Issue_Access_Token_tool
  - call: Validate_Access_Token_tool
  - abort_if: Validate_Access_Token_tool fails
  - call: Create_Subnet_PDUSession_tool
  - done: DONE
````
This is easier to parse and validate than freeform pseudocode.
---
## Model layout
Keep it minimal:
### A. Planner model
Input:
- normalized prompt
- normalized tool catalog
- planning rules
Output:
- workflow IR in YAML
### B. Composer model
Input:
- workflow IR
- markdown template
Output:
- final markdown skill document
### C. Validator
Prefer code first, optionally with a small LLM repair fallback.
This is enough. No separate intent extractor or critic agent is necessary unless complexity grows later.
---
## Prompting strategy
### Planner prompt example

You are the Planner for a skill-document generator.  
  
Your job is to convert:  
1. a user prompt  
2. a normalized tool catalog in JSON  
  
into a compact workflow plan in YAML.  
  
You must infer:  
- the skill name  
- the skill description  
- the operational goal  
- the relevant tools  
- the tool sequence  
- gate conditions  
- abort conditions  
- semantic continuity rules  
- critical execution rules  
- final completion states  
  
You must not:  
- write the final markdown document  
- invent tools that are not present in the tool catalog  
- invent parameter wiring  
- invent parameter values  
- add retries, loops, or branches unless they are clearly justified by the user prompt or the tool semantics  
- output JSON  
- output prose outside the YAML  
  
Planning principles:  
- Prefer the shortest valid workflow.  
- Use deterministic reasoning before creativity.  
- Tools that check, validate, or verify usually act as gates.  
- Tools that create, allocate, provision, or update context usually precede tools that consume that context.  
- A token issuance step must come before token validation.  
- A final access/session establishment step should come after prerequisite checks and authorization.  
- If a later step clearly depends on an earlier resource or artifact, the earlier step must appear first.  
- Even without parameter wiring, preserve semantic continuity across the workflow.  
  
You must ground the plan in the tool catalog:  
- use only real tool names  
- use tool descriptions to infer purpose and ordering  
- use required parameter names only as hints for semantic continuity, not as explicit wiring  
  
Output requirements:  
- Output YAML only.  
- Do not wrap the YAML in markdown fences.  
- Keep field names exactly as defined below.  
  
Output schema:  
  
meta:  
  name: string  
  description: string  
  
goal:  
  user_intent: string  
  success_condition: string  
  
tools:  
  - name: string  
    role: gate|provision|issue|validate|action|finalize|other  
    purpose: string  
  
workflow:  
  - call: string  
  - abort_if: string  
  - done: string  
  
continuity_rules:  
  - string  
  
critical_rules:  
  - string  
  
completion:  
  success: string  
  failure: string
### Composer prompt Example
You are the Composer for a skill-document generator.

Your job is to convert a workflow plan in YAML into the final markdown skill document.

You must preserve the planner output exactly.
You must not change tool order, add tools, remove tools, add new branches, or invent parameter wiring.

The markdown document must use this exact section order:

1. YAML front matter
2. H1 title
3. ## Overview
4. ## Tool Inventory
5. ## Workflow
6. ## Critical Rules
7. ## Output Format

Formatting rules:

Front matter:
- must contain:
  - name
  - description

Title:
- must be exactly:
  # {name} Skill

Overview:
- 1 to 3 short paragraphs
- explain what the skill does
- explain when it should trigger
- explain when it should not trigger
- keep wording concise and technical

Tool Inventory:
- bullet list
- one bullet per selected tool
- format:
  - `Tool_Name` — short purpose sentence.
- use the tool purpose from the workflow plan
- do not add tools not present in the plan

Workflow:
- must be a fenced YAML block
- must contain the workflow sequence from the plan
- preserve the exact order of items
- do not convert it to pseudocode
- do not add parameter wiring
- do not add comments unless they are already present in the plan

Critical Rules:
- bullet list
- include all critical_rules from the plan
- also include continuity_rules from the plan as concise operational constraints
- do not restate them as parameter mappings

Output Format:
- show ordered tool-call lines, one per call step
- then show the final status line
- use this style:

  Tool_A(...)
  Tool_B(...)
  ABORT or DONE

- do not fill in concrete parameters unless they are explicitly present in the input plan
- do not invent example values unless the user explicitly requested examples

Global rules:
- Output markdown only.
- Do not mention internal schemas, YAML IR, hidden reasoning, or planning logic.
- Do not use tables.
- Keep the document concise, deterministic, and machine-oriented.
---
## Generation algorithm
At runtime:
1. load tool JSON
2. normalize the prompt
3. normalize the tool catalog
4. run planner
5. validate planner YAML
6. run composer
7. validate final markdown
8. repair if needed
9. return final markdown
This keeps the pipeline short and controllable.
---
## Optional: validator contract

If you keep the validator rule-based, these are the checks it should enforce:

- front matter exists  
- name exists  
- description exists  
- required markdown sections exist in the correct order  
- every tool in Tool Inventory exists in the tool catalog  
- every workflow call exists in the tool catalog  
- tool inventory and workflow use the same tool set  
- workflow order matches planner output exactly  
- abort paths are preserved  
- success/failure states are present  
- continuity rules are reflected in Critical Rules  
- no parameter wiring appears in Workflow

## Example on ACN
With the ACN tool catalog, the planner should infer this sequence:
- `Subscription_tool`
- `Create_Or_Update_Subnet_Context_tool`
- `Issue_Access_Token_tool`
- `Validate_Access_Token_tool`
- `Create_Subnet_PDUSession_tool`
Abort conditions:
- abort if subscription fails
- abort if subnet context creation/update fails
- abort if token validation fails
Continuity rules:
- the same service scope should remain consistent from subscription through subnet setup
- the same subnet should be used across context creation, token issuance, token validation, and session creation
- the same target agent should be used across token issuance, token validation, and session creation
That is the level of logic the system should generate automatically.

