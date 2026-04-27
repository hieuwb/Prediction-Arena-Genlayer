# Tools

> Agent có gì trong tay, và luật khi dùng.

## Tool tiers

### Tier 0 — dùng tự do (không cần confirm)
Local, đảo ngược được, trong scope project.
- File reads (`Read`, `Grep`, `Glob`).
- Status query (`git status`, `git log`, `ls`).
- Edit file trong working tree.
- Chạy test, linter, type check, formatter.

### Tier 1 — thông báo trước khi làm
Có side effect thấy được, vẫn recover được.
- `git add` / `git commit` (local).
- `npm install` / `pip install` / cài dependency.
- Chạy dev server, build script.
- Tạo file / thư mục mới.

### Tier 2 — phải xin xác nhận rõ ràng
Khó undo, ảnh hưởng state chia sẻ.
- `git push`, `git pull --rebase`, branch operation.
- Deploy lên testnet / studio sandbox.
- Gọi on-chain transaction tốn gas.
- Gửi HTTP request mutate state tới third-party.
- Lệnh hủy diệt: `rm -rf`, `git reset --hard`, drop dữ liệu.

### Tier 3 — confirm LẠI từng lần, không pre-approve
Hỏng là thảm hoạ.
- Push lên `main` / deploy production.
- Force push.
- Đụng vào secret, key material, signing op.
- `--no-verify`, `--skip-hooks`, bypass sandbox.

## Per-tool rules

- **Read** — phải Read file một lần trong session trước mọi Edit cùng file đó.
- **Grep** — ưu tiên hơn `grep` / `rg` qua Bash. Mode mặc định `files_with_matches` để scout, rồi `content` khi cần dòng cụ thể.
- **Glob** — dùng cho pattern match tên file, không dùng để đếm hay nội dung.
- **Bash** — không dùng cho thao tác mà tool chuyên dụng đã có (Read/Edit/Write/Glob/Grep). Path có space phải quote.
- **Edit** — chỉ sau khi Read. Không silent rewrite — explain diff khi không hiển nhiên.
- **Write** — chỉ cho file mới hoặc rewrite toàn bộ. Sửa cục bộ thì dùng Edit.
- **WebFetch** — read-only; fail trên URL cần auth (dùng `gh` CLI cho GitHub).
- **gh CLI** — kênh chính cho mọi việc liên quan GitHub (issue, PR, check, release).
- **`<genlayer CLI>`** — `<khi nào dùng, khi nào fail, ví dụ: chỉ chạy trên studio local trước khi deploy testnet>`.
- **`<các tool dự án khác>`** — bổ sung tại đây.

## Failure handling
- Tool trả error → diagnose root cause; KHÔNG retry mù.
- Permission system từ chối → dừng; KHÔNG tìm cách bypass.
- Timeout → kiểm side effect đã land chưa trước khi retry.
- Lệnh thay đổi state mà output không xác nhận → verify bằng read query trước khi báo "done".

## Budgets
- Bash timeout mặc định 2 phút. Bump explicit khi cần; đừng đẩy max 10 phút mặc định.
- Lệnh chạy lâu → `run_in_background`, poll khi có signal completion (đừng sleep loop).
- WebFetch — dùng cache 15' khi có; tránh fetch lại cùng URL trong 1 turn.
- Subagent (xem [agents.md](./agents.md)) — không spawn cho việc 1 lệnh Read/Grep.

## Khi thêm tool mới
1. Quyết định tier (trên).
2. Viết 1 dòng rule dưới **Per-tool rules**.
3. Nếu Tier 2+, giải thích cho user lần đầu trước khi dùng.
4. Cập nhật [bootstrap.md](./bootstrap.md) pre-flight nếu tool là bắt buộc khi boot.
