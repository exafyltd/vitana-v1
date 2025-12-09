# VITANA Autopilot Training Files

This directory contains training data for the VITANA AI Autopilot system. These files define how the AI assistant understands and responds to user requests across all platform modules.

## File Format

All files are in JSON format (converted from JSONL for easier browsing). Each file contains an array of training examples.

### Training Example Structure

```json
{
  "intent_id": "hlth-biomarker-status-001",
  "user_utterance": "What are my vitamin D levels?",
  "context_summary": "User has recent biomarker data...",
  "app_state": { ... },
  "reasoning_trace": "User is asking about a specific biomarker...",
  "selected_action": {
    "action_id": "A1-HLTH-001",
    "action_name": "View Biomarker Summary"
  },
  "tool_invocations": [...],
  "assistant_response": "Your vitamin D level is 32 ng/mL...",
  "safety_notes": {
    "risk_level": "low",
    "requires_confirmation": false,
    "allowed_in_background": true
  }
}
```

## Action Capability Levels

- **A1 (Informational)**: Read-only queries, no state changes
- **A2 (Navigation)**: Screen navigation and UI state changes
- **A3 (Transactional)**: Low-risk data mutations (logging, RSVPs)
- **A4 (High-Risk)**: Financial transactions, PHI updates, require confirmation
- **A5 (Multi-Step)**: Complex workflows orchestrating multiple actions

## Module Files

| File | Module | Description |
|------|--------|-------------|
| `HLTH_AUTOPILOT_TRAINING.json` | Health | Biomarkers, sleep, hydration, plans |
| `COMM_AUTOPILOT_TRAINING.json` | Community | Events, groups, live rooms, messaging |
| `DISC_AUTOPILOT_TRAINING.json` | Discover | Products, cart, checkout, services |
| `WALL_AUTOPILOT_TRAINING.json` | Wallet | Credits, transfers, rewards, subscriptions |
| `SHAR_AUTOPILOT_TRAINING.json` | Sharing | Campaigns, distribution, channels |
| `AI_AUTOPILOT_TRAINING.json` | AI | Conversations, autopilot actions |
| `MEM_AUTOPILOT_TRAINING.json` | Memory | Diary entries, consolidation |
| `ADMN_AUTOPILOT_TRAINING.json` | Admin | Tenant config, automation rules |
| `SETT_AUTOPILOT_TRAINING.json` | Settings | Profile, preferences, notifications |

## Specialized Files

| File | Purpose |
|------|---------|
| `AUTOPILOT_TRAINING_MULTI_MODULE.json` | Cross-module workflow examples |
| `AUTOPILOT_TRAINING_FULL.json` | Complete combined dataset |
| `AUTOPILOT_TRAINING_FULL_LANGPATCHED.json` | Dataset with language handling |
| `AUTOPILOT_TRAINING_STRESSTEST.json` | Edge cases and safety scenarios |
| `AUTOPILOT_TRAINING_TOOL_VARIANTS.json` | Tool parameter variations |
| `AUTOPILOT_VOICE_GRAMMAR_MAPPING.json` | Voice command to action mappings |

## Language Support

Training includes examples in:
- **English** (primary)
- **German** (secondary)

Unsupported languages (e.g., Bosnian) trigger a language clarification response.

## Safety Rules

Training includes examples demonstrating:
- Medication safety refusals
- Privacy violation refusals
- Cross-tenant access prevention
- Fraud/suspicious activity detection
- PHI protection requirements
- Confirmation requirements for high-risk actions

## Usage

These files can be used for:
1. Fine-tuning language models for the VITANA assistant
2. Testing autopilot action classification
3. Validating safety rule enforcement
4. Documenting expected system behavior
