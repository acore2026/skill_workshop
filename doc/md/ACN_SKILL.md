---
name: ACN
description: Process of connecting embodied agents to the network.
---
# ACN Skill

## Overview

This Skill directs the workflow of a tool chain to connect a new embodied agent into a core network subnet. Follow the defined process to output the specific **Tool Name** and **Fill in Parameters**. Ensure all arguments are instantiated based on the context provided.

## Tool Inventory


## Workflow

Follow the pseudo-code logic below and fill in parameters for each tool to execute tasks.

    ```python
    # Step 1: Subscription Status Check
    CALL "Subscription_tool"
    IF "Subscription_tool" returns false:
        OUTPUT "ABORT" AND EXIT
    ELSE:
        # Step 2: Create/Update Subnet Context
        CALL "Create_Or_Update_Subnet_Context_tool"
        
        IF "Create_Or_Update_Subnet_Context_tool" returns false:
            OUTPUT "ABORT" AND EXIT
        ELSE:
            # Step 3: Issue Access Token
            CALL "Issue_Access_Token_tool"
            
            # Step 4: Token Validation
            CALL "Validate_Access_Token_tool"
            
            IF "Validate_Access_Token_tool" returns false:
                OUTPUT "ABORT" AND EXIT
            ELSE:
                # Step 5: Establish PDU Session
                CALL "Create_Subnet_PDUSession_tool"
                OUTPUT "DONE"
    ```


## Critical Rules

- Do not skip any step.
- All parameters marked as required must be provided. 
- When filling parameters, ensure values for identical keys remain consistent across all steps.
- For tools in the sequence (e.g., if Tool A is followed by Tool B), ensure that **all identical keys** shared between them maintain the exact same values.


## Output Format

Subscription_tool(ue_id="SUCI_12345", service_type="SubnetAccess", "is_subscribed"="True")
...
