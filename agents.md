# Agents

> Đội. Subagent mà agent chính có thể delegate.

## Roster

### Explore
- **Dùng khi**: search mở rộng trong codebase, dự kiến > 3 query, không chắc thứ cần tìm nằm đâu.
- **Không dùng khi**: đã biết file/symbol cụ thể — gọi Read/Grep trực tiếp.
- **Pass**: câu hỏi rõ ràng + thoroughness (`quick` / `medium` / `very thorough`).
- **Returns**: findings đã tổng hợp, không phải raw output.

### Plan
- **Dùng khi**: design implementation strategy cho task non-trivial.
- **Không dùng khi**: task đã được spec rõ hoặc thuần cơ học.
- **Pass**: goal, constraint, file đã biết là liên quan.
- **Returns**: ordered step list + verification mỗi bước.

### General-purpose
- **Dùng khi**: research multi-step không hợp specialist; keyword search độ tin thấp.
- **Pass**: brief tự đủ — agent không có context trước.
- **Returns**: tự do, dặn rõ format khi cần.

### `<Project-specific subagents — bổ sung khi có>`
- Ví dụ: `genlayer-tester` — chạy intelligent contract trong studio sandbox, return pass/fail + log.
- Ví dụ: `r3f-reviewer` — review scene Three.js / R3F về perf (draw call, overdraw, GC).
- Ví dụ: `contract-fuzz` — fuzz input cho `placeBet` / `claim` để dò edge case.

## Delegation rules
- Spawn **parallel** khi sub-task độc lập. Sequential chỉ khi có dependency thật.
- Brief như đồng nghiệp vừa bước vào phòng: state goal, đã thử & loại trừ gì, kỳ vọng output dạng nào.
- Cap response length khi không cần raw ("báo cáo dưới 200 từ").
- KHÔNG delegate phần *understanding*. Subagent trả về *intent*, không phải *truth* — verify edit thật bằng Read.
- KHÔNG đụp việc: subagent đang search X thì agent chính đừng cũng search X.

## Handoff protocol
Khi giao việc:
1. Nói goal, không chỉ step.
2. Hand path/command cụ thể nếu đã biết. Hand câu hỏi nếu đang investigate.
3. Subagent return → tổng hợp lại cho user, đừng paste raw.

## Aggregation (nhiều subagent cùng return)
- Reconcile mâu thuẫn rõ ràng.
- Surface thứ chưa ai trả lời — đừng quét xuống thảm.
- Cite "agent nào nói gì" chỉ khi user có thể muốn dig sâu.

## Spawning hygiene
- Trước khi spawn agent mới: kiểm có agent cùng loại đang chạy / vừa chạy xong không. Có thì `SendMessage` tiếp tục thay vì spawn mới (mất context).
- Background agent: dùng `run_in_background=true` khi có việc parallel thật. Đừng dùng "để chờ" — sẽ tự nhận notification khi xong.
- `isolation: "worktree"` cho việc dài, dễ rollback nếu agent đi sai.

## Anti-patterns
- ❌ Spawn subagent cho 1 lệnh Read/Grep.
- ❌ Prompt kiểu lệnh ngắn ("find the bug") — sinh output nông.
- ❌ Để subagent tự quyết *change* khi prompt chỉ yêu cầu *research*.
- ❌ Spawn 5 agent song song khi 2 là đủ — cost & noise.
