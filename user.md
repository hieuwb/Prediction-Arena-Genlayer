# User

> Agent đang làm việc cho ai. Cập nhật khi quan hệ tiến triển.

## Profile
- **Handle / email**: `hoangtung0910hn@gmail.com`
- **Role**: `<solo dev / hackathon team lead / ...>`
- **Tech depth**: `<novice / intermediate / senior — chia theo domain nếu cần>`
- **Domains**: `<crypto, smart contract, GenLayer Intelligent Contract, Three.js / R3F, frontend>`
- **Time zone / working hours**: `<optional, vd: ICT, làm tối>`

## Communication preferences
- **Language**: Tiếng Việt cho giải thích; identifier / log / commit message giữ tiếng Anh.
- **Tone**: `<terse / friendly / formal>` — mặc định: trực tiếp, ngắn.
- **Code blocks**: ưu tiên minimal + runnable; show diff khi sửa file lớn.
- **Length default**: ngắn — câu trả lời dạng "1-2 câu + bullet" khi có thể.

## Project context
- **Current project**: Prediction Arena 3D — dApp 3D trên GenLayer cho hackathon (xem `plan.md`).
- **Phase**: `<prototype / hackathon-week / pre-launch / maintenance>`
- **Deadlines**: `<date hoặc "none">`
- **Stack snapshot**: Vite + React + R3F + Tailwind ⇄ GenLayer Studio/Testnet (Intelligent Contract Python).

## Authorization

### Đã pre-approve (không cần confirm từng lần)
- [x] Read + edit file trong project.
- [x] Cài dependency của project.
- [x] Chạy test / dev server local.
- [x] Local commit (chưa push).

### Vẫn cần confirm rõ ràng
- [ ] Push lên remote (mọi branch).
- [ ] On-chain transaction tốn gas (testnet hoặc mainnet).
- [ ] Đụng `main` branch.
- [ ] Gọi external paid API.
- [ ] Mọi thứ trong [tools.md](./tools.md) Tier 2+.

> Pre-approval một lần KHÔNG có nghĩa là approve mãi mãi. Nếu bối cảnh đổi, hỏi lại.

## Escalation
Khi nào nên cắt ngang user vs. cứ làm tiếp:

- **Always interrupt**: hard constraint xung đột, scope mơ hồ, nghi ngờ lỗ hổng bảo mật, tool/permission denied.
- **Batch + hỏi sau**: preference style, naming choice, refactor low-stakes.
- **Never interrupt**: routine progress, từng tool call, heartbeat nội bộ.

## Voice of user
Cụm từ user hay dùng — mirror lại khi surface công việc:
- `"đẩy lên"` → push to remote.
- `"chạy thử"` → run dev server / chạy local test, không phải deploy.
- `"gọn lại"` → simplify / shorten — không phải refactor lớn.
- `"ship"` → finalize + tạo PR (xác nhận lại nếu là on-chain).
- `<add khi observe>`

## Things to remember
Quan sát bền vững, cập nhật theo memory system (xem `~/.claude/projects/.../memory/`):
- `<vd: user prefer giải thích Tiếng Việt + comment code Tiếng Anh>`
- `<vd: user thường yêu cầu plan trước khi code cho task > 30 phút>`
- `<add khi học được>`

> File này giữ subset bền vững. Quan sát ephemeral thuộc về memory system, không thuộc về `user.md`.
