# 🏟️ Prediction Arena 3D — Kế hoạch chi tiết (tự lấy tên dự án)

> dApp 3D Three.js trên GenLayer cho hackathon


---

## 1. Tóm tắt sản phẩm (Pitch 30 giây)

> *"Prediction Arena là một đấu trường 3D nơi người chơi đặt cược vào các sự kiện có thật trên web — bóng đá, giá crypto, kết quả bầu cử. Mỗi sự kiện là một cột trụ ánh sáng trong arena. Khi sự kiện kết thúc, GenLayer's Intelligent Contract tự động fetch dữ liệu thật từ internet (BBC, CoinGecko...), nhiều validator AI cùng "đọc" trang web và đồng thuận về kết quả — không oracle, không trung gian. Cột trụ phát sáng vàng, người thắng nhận thưởng tự động."*

**Hook khác biệt với mọi prediction market khác:** Không cần admin resolve, không cần Chainlink oracle, không cần ai đó nhập kết quả. AI validator đọc thẳng web → đồng thuận → trả thưởng.

---

## 2. Scope MVP (Phải-có vs Nên-có)

| Phải có (MVP cho hackathon) | Nên có (nếu còn thời gian) | Không làm |
|---|---|---|
| 1 Intelligent Contract `PredictionArena` | Multi-market (nhiều trận cùng lúc) | Multi-chain bridge |
| Tạo market mới (admin) | Leaderboard 3D | NFT reward |
| Đặt cược (place bet) | Sound/music | Mobile responsive perfect |
| Resolve qua web fetch | Particle khi đặt cược | Wallet abstraction |
| Claim thưởng | Camera cinematic orbit | Multiplayer realtime |
| Arena 3D với 3-5 pillars | Skybox đẹp | |
| UI đặt cược + claim | | |

**Mục tiêu thực tế cho 5 ngày:** 1 arena, 3 markets demo (1 bóng đá, 1 crypto price, 1 sự kiện chung), full flow bet → resolve → claim.

---

## 3. Kiến trúc hệ thống

```
┌──────────────────────────────────────────────┐
│  FRONTEND (Vite + React + R3F + Tailwind)    │
│  ┌────────────────┐  ┌────────────────────┐ │
│  │ 3D Scene       │  │ UI Overlay         │ │
│  │ (Three.js/R3F) │  │ - Bet modal        │ │
│  │ - Arena floor  │  │ - Market list      │ │
│  │ - 3 Pillars    │  │ - Wallet button    │ │
│  │ - Particles    │  │ - Status toast     │ │
│  └────────────────┘  └────────────────────┘ │
│                    ↕                         │
│            GenLayerJS SDK                    │
└────────────────────┬─────────────────────────┘
                     │ JSON-RPC
┌────────────────────▼─────────────────────────┐
│   GENLAYER STUDIO / TESTNET                  │
│   ┌──────────────────────────────────────┐  │
│   │ Intelligent Contract (Python)        │  │
│   │ - createMarket()                     │  │
│   │ - placeBet()                         │  │
│   │ - resolve() ← gl.nondet.web.get()    │  │
│   │ - claim()                            │  │
│   └──────────────────────────────────────┘  │
│                    ↕                         │
│   AI Validators (GPT/Claude/Gemini...)       │
│           ↕  Equivalence Principle           │
│      Internet (BBC, CoinGecko...)            │
└──────────────────────────────────────────────┘
```

---

## 4. Smart Contract — `PredictionArena.py`

Dựa trên example chính thức của GenLayer, mở rộng để hỗ trợ multi-market + betting + claim:

```python
# { "Depends": "py-genlayer:1jb45aa8ynh2a9c9xn3b7qqh8sm5q93hwfp7jqmwsfhh8jpz09h6" }
from genlayer import *
import json
import typing

class Market:
    market_id: str
    question: str          # "Brazil vs Jamaica - 2024-06-05"
    resolution_url: str    # "https://www.bbc.com/sport/football/..."
    options: list[str]     # ["Brazil", "Draw", "Jamaica"]
    total_pool: u256
    bets: TreeMap[Address, TreeMap[u32, u256]]  # user -> option_idx -> amount
    option_pools: list[u256]
    is_resolved: bool
    winning_option: i32    # -1 nếu chưa resolve
    creator: Address

class PredictionArena(gl.Contract):
    markets: TreeMap[str, Market]
    market_ids: DynArray[str]
    owner: Address

    def __init__(self):
        self.owner = gl.message.sender_account

    @gl.public.write
    def create_market(self, market_id: str, question: str,
                      resolution_url: str, options: list[str]):
        assert market_id not in self.markets, "Market exists"
        m = Market()
        m.market_id = market_id
        m.question = question
        m.resolution_url = resolution_url
        m.options = options
        m.option_pools = [u256(0)] * len(options)
        m.is_resolved = False
        m.winning_option = -1
        m.creator = gl.message.sender_account
        self.markets[market_id] = m
        self.market_ids.append(market_id)

    @gl.public.write.payable
    def place_bet(self, market_id: str, option_idx: u32):
        m = self.markets[market_id]
        assert not m.is_resolved, "Already resolved"
        amount = gl.message.value
        assert amount > 0, "Need stake"
        sender = gl.message.sender_account
        m.bets[sender][option_idx] = m.bets[sender].get(option_idx, u256(0)) + amount
        m.option_pools[option_idx] += amount
        m.total_pool += amount

    @gl.public.write
    def resolve(self, market_id: str) -> typing.Any:
        m = self.markets[market_id]
        if m.is_resolved:
            return "Already resolved"

        def nondet() -> str:
            response = gl.nondet.web.get(m.resolution_url)
            web_data = response.body.decode("utf-8")[:8000]  # truncate

            options_str = ", ".join([f"{i}: {opt}" for i, opt in enumerate(m.options)])
            task = f"""Read the web page below and determine the outcome of:
            "{m.question}"

            Possible options: {options_str}

            Web page content:
            {web_data}
            End of content.

            Respond ONLY in JSON:
            {{
                "winning_option": int,  // index of winning option, or -1 if not resolved yet
                "reasoning": str        // 1-sentence explanation
            }}
            """
            result = gl.nondet.exec_prompt(task).replace("```json", "").replace("```", "")
            return json.dumps(json.loads(result), sort_keys=True)

        result = json.loads(gl.eq_principle.strict_eq(nondet))

        if result["winning_option"] >= 0:
            m.is_resolved = True
            m.winning_option = result["winning_option"]
        return result

    @gl.public.write
    def claim(self, market_id: str):
        m = self.markets[market_id]
        assert m.is_resolved, "Not resolved"
        sender = gl.message.sender_account
        win_idx = u32(m.winning_option)
        user_bet = m.bets[sender].get(win_idx, u256(0))
        assert user_bet > 0, "Nothing to claim"

        # payout = (user_bet / winning_pool) * total_pool
        winning_pool = m.option_pools[win_idx]
        payout = (user_bet * m.total_pool) // winning_pool

        m.bets[sender][win_idx] = u256(0)  # prevent re-claim
        gl.message.sender_account.send(payout)

    @gl.public.view
    def get_market(self, market_id: str) -> dict:
        m = self.markets[market_id]
        return {
            "question": m.question,
            "options": list(m.options),
            "option_pools": [int(p) for p in m.option_pools],
            "total_pool": int(m.total_pool),
            "is_resolved": m.is_resolved,
            "winning_option": m.winning_option,
        }

    @gl.public.view
    def list_markets(self) -> list[str]:
        return list(self.market_ids)
```

> ⚠️ **Lưu ý syntax:** GenLayer Python types (`u256`, `Address`, `TreeMap`, `DynArray`) có thể có quirks nhỏ — bạn sẽ phải tinh chỉnh khi test trên Studio. Đoạn trên là blueprint, không copy-paste blind. Tham khảo `Storage` và `Collection Types` trong docs.

---

## 5. Frontend 3D — Cấu trúc scene

```
<Canvas>
  ├── <Lights>             // Ambient + directional + 3 colored spotlights
  ├── <Skybox/>            // Gradient or HDRI futuristic
  ├── <ArenaFloor/>        // Hexagonal tile, glow grid (shader)
  ├── <Pillars>            // 3-5 cột, 1 cột/market
  │   └── <Pillar>
  │       ├── Glowing cylinder (option pool height)
  │       ├── Floating text (question)
  │       ├── Particle ring khi có bet
  │       └── Color: blue=open, gold=resolved+win, red=resolved+lose
  ├── <CameraOrbit/>        // OrbitControls + auto-rotate idle
  └── <Effects>             // Bloom, chromatic aberration (postprocessing)
</Canvas>

<UIOverlay>                  // Tailwind, position: absolute
  ├── Top: Wallet status, network indicator
  ├── Right: Market list panel (collapsible)
  ├── Center: Bet modal (when pillar clicked)
  └── Bottom: Toast notifications
</UIOverlay>
```

**Tương tác chính:**
- Hover pillar → glow tăng, hiện tooltip
- Click pillar → camera zoom mượt + mở bet modal
- Sau khi bet → particle bay từ ví đến pillar
- Khi resolve → animation: pillar rung, ánh sáng nổ, confetti nếu thắng
- Có nút "Resolve Now" cho market sau deadline

---

## 6. Tech Stack chi tiết

| Layer | Tool | Lý do chọn |
|---|---|---|
| Build tool | **Vite** | Nhanh, hot reload tốt cho 3D |
| 3D | **@react-three/fiber** + **@react-three/drei** | Viết Three.js bằng JSX, dễ hơn vanilla 100x |
| Effects | **@react-three/postprocessing** | Bloom = key cho look "neon arena" |
| UI | **Tailwind CSS** + **shadcn/ui** | Setup nhanh, đẹp |
| State | **Zustand** | Nhẹ, không boilerplate như Redux |
| Blockchain | **genlayer-js** | SDK chính thức |
| Wallet | MetaMask injected | GenLayer testnet support |
| Deploy | **Vercel** (frontend) + **GenLayer Studio/Testnet Bradbury** (contract) | Free tier đủ dùng |

**Cài đặt:**
```bash
npm create vite@latest prediction-arena -- --template react-ts
cd prediction-arena
npm i three @react-three/fiber @react-three/drei @react-three/postprocessing
npm i zustand genlayer-js
npm i -D tailwindcss postcss autoprefixer
```

---

## 7. Roadmap 5 ngày — chi tiết theo giờ

### **Day 1 — Smart Contract (8h)**
| Giờ | Việc |
|---|---|
| 0–2h | Setup GenLayer Studio, chạy example `Football Prediction Market` thành công |
| 2–5h | Code `PredictionArena.py` — viết và test `create_market`, `place_bet` |
| 5–7h | Test `resolve` với BBC URL thật (ví dụ một trận đã đá xong) |
| 7–8h | Test `claim`, fix bugs payout math |

✅ **Deliverable cuối ngày:** Contract chạy được full flow trên Studio, có 1 market test resolve thành công.

### **Day 2 — Frontend Setup + 3D Scene cơ bản (8h)**
| Giờ | Việc |
|---|---|
| 0–1h | Vite + Tailwind + R3F setup, hello cube |
| 1–3h | Arena floor (PlaneGeometry + custom shader grid) |
| 3–5h | Pillar component — cylinder + emissive material |
| 5–7h | OrbitControls, lighting, bloom postprocessing |
| 7–8h | Skybox + camera framing đẹp |

✅ **Deliverable:** Arena 3D nhìn "đã mắt" với 3 pillars tĩnh, screenshot demo được.

### **Day 3 — Tích hợp blockchain (8h)**
| Giờ | Việc |
|---|---|
| 0–2h | Setup genlayer-js client, connect wallet |
| 2–4h | `useMarkets` hook — read `list_markets` + `get_market` |
| 4–6h | Bet modal UI + gọi `place_bet` |
| 6–8h | Resolve button + claim button + toast notifications |

✅ **Deliverable:** Đặt được bet, resolve được market, claim được thưởng — full loop.

### **Day 4 — Polish 3D + UX (8h)**
| Giờ | Việc |
|---|---|
| 0–2h | Pillar height = total_pool (animate lerp) |
| 2–4h | Click pillar → camera zoom + mở modal |
| 4–6h | Particle effects khi bet (instanced mesh) |
| 6–7h | Resolve animation: pillar rung, flash, confetti |
| 7–8h | Polish UI overlay, responsive cơ bản |

✅ **Deliverable:** Demo "wow" — nhìn vào hiểu ngay app làm gì.

### **Day 5 — Demo + Deploy + Submit (6h)**
| Giờ | Việc |
|---|---|
| 0–1h | Deploy contract lên testnet Bradbury |
| 1–2h | Deploy frontend lên Vercel, hardcode contract address |
| 2–3h | Tạo 3 markets demo (bóng đá đã đá xong, BTC price, etc.) |
| 3–4h | Quay demo video 2-3 phút (Loom/OBS) |
| 4–5h | Viết README đẹp + architecture diagram |
| 5–6h | Submit hackathon, tweet tag @GenLayer, post Discord |

✅ **Deliverable:** Project public, video demo, link live.

---

## 8. Rủi ro & cách giảm thiểu

| Rủi ro | Xác suất | Giảm thiểu |
|---|---|---|
| GenLayer Python types khó hơn dự kiến | Cao | Day 1 dành 2h đầu chỉ để chạy example chính thức trước khi tự code |
| `resolve()` trả kết quả sai do prompt yếu | Trung bình | Test với 5+ URL khác nhau, refine prompt, dùng `strict_eq` |
| Web fetch fail / trang BBC đổi format | Trung bình | Có fallback URL, test trước với trận đã đá xong rõ ràng |
| 3D scene quá phức tạp, máy yếu lag | Trung bình | Giới hạn 5 pillars, dùng instanced mesh cho particles, không dùng shadow phức tạp |
| Wallet integration trục trặc | Thấp | Theo đúng project boilerplate trong docs GenLayer |
| Hết thời gian polish | Cao | Cắt scope sớm — bỏ multi-market trước, giữ 1 market đẹp còn hơn 5 cái xấu |

---

## 9. Tiêu chí thắng hackathon — Self-check

Hackathon thường chấm theo các tiêu chí:

- ✅ **Innovation/uniqueness:** Web fetch trực tiếp on-chain = USP của GenLayer
- ✅ **Technical execution:** Smart contract + 3D frontend full-stack
- ✅ **UX/Polish:** Arena 3D bloom + particles → khác biệt với 99% submission khác (toàn dashboard)
- ✅ **Demo quality:** 3D dễ quay video ấn tượng
- ✅ **Use case clarity:** Prediction market ai cũng hiểu
- ✅ **Documentation:** README rõ ràng + diagram

---

## 10. Hành động ngay (next 24h)

1. Đăng ký Builders Program: https://points.genlayer.foundation/
2. Vào Studio: https://studio.genlayer.com → load example "Football Prediction Market" → deploy thử
3. Vào Discord Rally hỏi mentor về quirks của testnet Bradbury
4. Clone project boilerplate (nếu có) từ docs

---

## 11. Tài nguyên tham khảo

- **Website:** https://www.genlayer.com/
- **Docs:** https://docs.genlayer.com/
- **Studio:** https://studio.genlayer.com/contracts
- **Football Prediction example:** https://docs.genlayer.com/developers/intelligent-contracts/examples/prediction
- **GenLayerJS:** https://docs.genlayer.com/api-references/genlayer-js
- **Project Boilerplate:** https://docs.genlayer.com/developers/decentralized-applications/project-boilerplate
- **GitHub:** https://github.com/yeagerai/genlayer-simulator
- **Builders Program:** https://points.genlayer.foundation/
- **Discord Rally:** https://discord.gg/guFPdcpF74
- **GenLayer GPT:** https://chatgpt.com/g/g-ix5a9SoHm-deepthought-genlayer
