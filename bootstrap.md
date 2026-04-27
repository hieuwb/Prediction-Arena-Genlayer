# Bootstrap

> Cold-start sequence. Chạy một lần khi session agent bắt đầu.

## Boot order
Đọc các file theo thứ tự — mỗi bước phải xong trước khi sang bước kế:

1. **Identity** — load [identity.md](./identity.md). Adopt mission, voice, hard constraints.
2. **User profile** — load [user.md](./user.md). Ghi nhận preference, ngôn ngữ, authorization scope.
3. **Tool catalog** — load [tools.md](./tools.md). Map capability vào task hiện tại.
4. **Subagents** — load [agents.md](./agents.md). Biết ai có thể delegate.
5. **Project state**:
   - Đọc `plan.md` (hoặc tài liệu mục tiêu hiện hành).
   - Chạy `git status` + `git log -5` để nắm context gần nhất.
   - Liệt kê task đang dở / TODO còn mở.
6. **Activate heartbeat** — bắt đầu chu trình tick theo [heartbeat.md](./heartbeat.md).

## Pre-flight checks
Abort + báo user nếu một mục fail:
- [ ] Working directory đúng project root.
- [ ] Tool bắt buộc reachable (`gh`, `node`, `genlayer` CLI, `python`, ...).
- [ ] Không còn state hủy diệt cần recover (rebase đang dở, lock file lạ, ...).
- [ ] 6 file framework (`identity / bootstrap / heartbeat / tools / agents / user`) đều tồn tại.

## First-turn protocol
Trên message đầu tiên của user sau khi boot:
1. Acknowledge ≤ 2 câu — KHÔNG dump lại identity dài dòng.
2. Nếu yêu cầu mơ hồ, restate lại bằng lời mình + hỏi 1 câu chốt.
3. Đề xuất plan chỉ khi task non-trivial; task vặt thì làm thẳng.

## Boot output template
Log ngắn ≤ 3 dòng, không block:
```
[boot] identity=<name> user=<handle> tools=N agents=M
[boot] project=<path> branch=<name> status=<clean|dirty>
[boot] ready
```

## Failure modes
- **Thiếu identity.md** → halt. Yêu cầu user seed identity trước.
- **Conflict giữa các file** (vd: `user.md` cho phép X mà `identity.md` cấm X) → flag conflict; ưu tiên `identity.md`.
- **Stale state** (heartbeat lần trước log "WIP rebase") → recover trước khi nhận task mới.
- **Tool bắt buộc thiếu** → liệt kê thiếu cái gì, đề xuất cài, KHÔNG fallback im lặng.

## Reboot
Khi nào cần re-bootstrap giữa session:
- File trong framework này được sửa đáng kể.
- Chuyển project / chuyển branch sang một context khác hẳn.
- User yêu cầu rõ ràng ("reset", "boot lại", "quên hết").
