# Composition Gate — character-avatar-source-selector

- HEAD_SHA: 798418f5686453a653581813a518ddf324d30bb0
- BASE_SHA: 6d1d4e1c3b0edbbfa526b233e5509c3a43c16dc6
- Verdict: CLEAR

## Event
Source card select → gated Import/Meshy/SagaDrive flow → shared CharacterAvatarDto.source on save

## Hop chain
1. AvatarSourceSelector (UI origin)
2. CharacterEditor requestAvatarSourceChange (+ dirty confirm)
3. createCharacterStudioAvatar writes `source` (provider stays legacy)
4. resolveAvatarSource on hydrate (legacy provider → sagadrive)
5. Capabilities still from morph/#6 — never from source alone

## Simulations
| Case | Expected | Result |
|------|----------|--------|
| N-actors | Each editor instance owns own source state | pass |
| Invalid/missing | Missing source → sagadrive; model_url without source → import | pass |
| Two consumers / crash | Dirty sagadrive switch prompts; cancel keeps prior source | pass |

## Flags
- none
