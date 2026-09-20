# Composition Gate — player-test-session-security-lifecycle (#296)

**Result:** CLEAR  
**Hop:** SessionJoin → session-service RPC → SECURITY DEFINER (create/join/status/leave) → sessions/session_players  
**N-actors:** GM create + player join via distinct RPCs; auth.uid() only  
**Invalid/missing:** bad code / incomplete sheet / non-GM status → exception  
**Two consumers:** SessionJoin + useSessions share session-service; no parallel hosted path  

