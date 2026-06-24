# Hướng dẫn sử dụng 9 Vercel Skills cho mọi project

Tài liệu này dùng để hướng dẫn agent như Cursor Agent áp dụng đúng 9 skill Vercel đã cài. Có thể đặt file này trong root project hoặc lưu riêng để copy prompt khi cần.

---

## 1. Nguyên tắc dùng Vercel Skills

Vercel Skills không phải là lệnh chạy trực tiếp như `npm run ...`. Đây là bộ hướng dẫn để AI agent đọc và áp dụng khi review, sửa code, tối ưu hoặc deploy project.

Cấu trúc prompt nên dùng:

```text
Hãy dùng skill `<tên-skill>`.

Mục tiêu:
- ...

Yêu cầu:
- Kiểm tra các file liên quan
- Chưa chỉnh sửa file nếu chưa được yêu cầu
- Nếu sửa file, giải thích rõ file nào đã sửa và vì sao
```

Khi muốn agent chỉ phân tích, thêm câu:

```text
Chỉ phân tích và đề xuất, chưa chỉnh sửa file.
```

Khi muốn agent sửa luôn, thêm câu:

```text
Có thể chỉnh sửa file nếu cần, nhưng giữ thay đổi tối thiểu và không làm đổi logic hiện tại.
```

---

## 2. Cách test nhanh một skill

Mở đúng root folder của project trong Cursor, ví dụ folder có:

```text
package.json
src/
app/
pages/
next.config.js
vite.config.ts
.env.local
```

Sau đó mở Cursor Agent và dùng prompt:

```text
Hãy dùng skill `vercel-react-best-practices`.

Review project hiện tại và tìm các vấn đề về hiệu năng React/Next.js. Chỉ báo cáo vấn đề, nguyên nhân và hướng sửa. Chưa chỉnh sửa file.
```

Nếu agent trả lời có nhắc tới performance, bundle, data fetching, server/client component, caching hoặc rendering pattern thì skill đã được áp dụng đúng hướng.

---

## 3. Danh sách 9 skill và cách dùng

## 3.1. `vercel-composition-patterns`

### Mục đích
Dùng khi cần refactor component React, thiết kế component tái sử dụng, giảm boolean props, hoặc cải thiện kiến trúc component.

### Dùng khi
- Component có quá nhiều props kiểu `isOpen`, `isActive`, `isPrimary`, `showIcon`, `hasBorder`...
- Muốn chuyển sang compound components
- Muốn dùng render props hoặc context provider
- Muốn thiết kế component library dễ mở rộng
- Muốn refactor UI component phức tạp

### Prompt mẫu: chỉ review

```text
Hãy dùng skill `vercel-composition-patterns`.

Review các React component trong project hiện tại. Tìm các component đang bị phình props, lặp logic UI, hoặc khó tái sử dụng. Đề xuất cách refactor bằng composition pattern phù hợp. Chưa chỉnh sửa file.
```

### Prompt mẫu: sửa luôn

```text
Hãy dùng skill `vercel-composition-patterns`.

Refactor các component phù hợp sang React composition pattern. Giữ nguyên hành vi UI hiện tại, tránh thay đổi logic business, và giải thích rõ từng file đã chỉnh sửa.
```

---

## 3.2. `deploy-to-vercel`

### Mục đích
Dùng khi muốn deploy project lên Vercel, tạo preview deployment, hoặc kiểm tra project trước khi đưa live.

### Dùng khi
- Muốn deploy app/site lên Vercel
- Muốn tạo preview deployment
- Muốn kiểm tra lỗi trước deploy
- Muốn biết project đã sẵn sàng deploy chưa
- Muốn lấy link sau khi deploy

### Prompt mẫu: kiểm tra trước deploy

```text
Hãy dùng skill `deploy-to-vercel`.

Kiểm tra project hiện tại đã sẵn sàng deploy lên Vercel chưa. Review framework, build command, output directory, biến môi trường, package manager, Prisma/database nếu có, và các rủi ro có thể làm deploy fail. Chưa deploy và chưa chỉnh sửa file.
```

### Prompt mẫu: deploy

```text
Hãy dùng skill `deploy-to-vercel`.

Deploy project hiện tại lên Vercel. Trước khi deploy, kiểm tra lỗi build/config cơ bản. Nếu cần thay đổi file, hãy giải thích trước khi sửa. Sau khi deploy, trả về link deployment và các bước đã thực hiện.
```

---

## 3.3. `vercel-react-best-practices`

### Mục đích
Dùng để review hoặc tối ưu React/Next.js theo best practices của Vercel, đặc biệt về performance.

### Dùng khi
- Tối ưu React component
- Tối ưu Next.js App Router hoặc Pages Router
- Kiểm tra server/client component
- Tối ưu data fetching
- Giảm bundle size
- Tối ưu image, font, loading, caching
- Tìm nguyên nhân app chạy chậm

### Prompt mẫu: review performance

```text
Hãy dùng skill `vercel-react-best-practices`.

Review project React/Next.js hiện tại theo best practices hiệu năng. Tập trung vào server/client components, data fetching, bundle size, image/font optimization, caching và rendering strategy. Chỉ báo cáo vấn đề và hướng sửa, chưa chỉnh sửa file.
```

### Prompt mẫu: tối ưu code

```text
Hãy dùng skill `vercel-react-best-practices`.

Tối ưu project React/Next.js hiện tại theo best practices. Ưu tiên thay đổi có tác động lớn và ít rủi ro. Không làm thay đổi UI/logic hiện tại. Giải thích rõ từng file đã chỉnh sửa.
```

---

## 3.4. `vercel-react-native-skills`

### Mục đích
Dùng cho project React Native hoặc Expo, đặc biệt khi tối ưu performance mobile, list rendering, animation hoặc native modules.

### Dùng khi
- Project dùng React Native hoặc Expo
- App mobile bị lag
- FlatList/SectionList render chậm
- Tối ưu animation
- Làm việc với native modules
- Tối ưu navigation hoặc screen transition

### Prompt mẫu: review React Native/Expo

```text
Hãy dùng skill `vercel-react-native-skills`.

Review project React Native/Expo hiện tại. Kiểm tra performance, list rendering, navigation, animation, asset loading và native module usage. Chỉ báo cáo vấn đề và hướng sửa, chưa chỉnh sửa file.
```

### Prompt mẫu: tối ưu mobile app

```text
Hãy dùng skill `vercel-react-native-skills`.

Tối ưu project React Native/Expo hiện tại để giảm lag và cải thiện trải nghiệm mobile. Ưu tiên FlatList/SectionList, memoization, animation và asset loading. Giữ nguyên logic hiện tại và giải thích từng thay đổi.
```

---

## 3.5. `vercel-react-view-transitions`

### Mục đích
Dùng để thêm animation chuyển cảnh bằng React View Transition API, không cần thư viện animation bên thứ ba.

### Dùng khi
- Muốn thêm page transition
- Muốn animate route changes
- Muốn shared element animation
- Muốn animate component enter/exit
- Muốn animate list reorder
- Muốn transition theo hướng forward/back
- Muốn dùng `<ViewTransition>`, `addTransitionType`, `startViewTransition`

### Prompt mẫu: kiểm tra khả năng áp dụng

```text
Hãy dùng skill `vercel-react-view-transitions`.

Kiểm tra project React/Next.js hiện tại và đánh giá xem có thể áp dụng React View Transitions an toàn không. Xác định các page/component phù hợp để thêm hiệu ứng chuyển cảnh, các thay đổi code cần thiết, rủi ro tương thích, và chưa chỉnh sửa file.
```

### Prompt mẫu: áp dụng transition

```text
Hãy dùng skill `vercel-react-view-transitions`.

Áp dụng React View Transitions vào project này ở những vị trí phù hợp. Tập trung vào page transitions và shared element animations nếu có. Giữ thay đổi tối thiểu, không làm hỏng routing/UI hiện tại, và giải thích rõ từng file đã chỉnh sửa.
```

---

## 3.6. `vercel-cli-with-tokens`

### Mục đích
Dùng khi deploy hoặc quản lý Vercel bằng CLI với token, không dùng login tương tác.

### Dùng khi
- Deploy bằng Vercel CLI trong môi trường CI/CD
- Dùng `VERCEL_TOKEN`
- Setup deploy tự động
- Thêm/sửa environment variables trên Vercel bằng CLI
- Không muốn hoặc không thể login tương tác

### Prompt mẫu: setup CLI token

```text
Hãy dùng skill `vercel-cli-with-tokens`.

Hướng dẫn setup Vercel CLI cho project hiện tại bằng token authentication. Bao gồm cách dùng `VERCEL_TOKEN`, cách link project, cách pull env, cách deploy preview/production và các biến môi trường cần kiểm tra. Chưa chạy lệnh deploy.
```

### Prompt mẫu: deploy bằng token

```text
Hãy dùng skill `vercel-cli-with-tokens`.

Chuẩn bị quy trình deploy project hiện tại lên Vercel bằng token. Tạo danh sách lệnh cần chạy cho Windows PowerShell, bao gồm link project, pull env, build check, preview deploy và production deploy.
```

---

## 3.7. `vercel-optimize`

### Mục đích
Dùng để tối ưu chi phí, hiệu năng và usage của project đã deploy trên Vercel.

### Dùng khi
- Bill Vercel tăng cao
- Function Invocations cao
- Build Minutes cao
- Fast Data Transfer cao
- Route chậm hoặc tốn tài nguyên
- Core Web Vitals kém
- Muốn tối ưu caching
- Muốn phân tích usage/cost theo route hoặc config

### Prompt mẫu: audit tối ưu

```text
Hãy dùng skill `vercel-optimize`.

Audit project hiện tại để tìm cơ hội tối ưu chi phí và hiệu năng trên Vercel. Tập trung vào caching, serverless functions, data fetching, image optimization, build time, route performance và config. Chỉ đưa ra khuyến nghị có căn cứ từ file hoặc metric rõ ràng. Chưa chỉnh sửa file.
```

### Prompt mẫu: tối ưu sau deploy

```text
Hãy dùng skill `vercel-optimize`.

Phân tích project đã deploy trên Vercel để tìm nguyên nhân gây tốn chi phí hoặc chậm. Ưu tiên các vấn đề có thể xác minh bằng metrics/logs/config/code. Đưa ra danh sách khuyến nghị theo mức độ tác động và rủi ro.
```

---

## 3.8. `web-design-guidelines`

### Mục đích
Dùng để review UI/UX, accessibility và chất lượng giao diện web.

### Dùng khi
- Muốn review UI
- Muốn kiểm tra accessibility
- Muốn audit UX
- Muốn kiểm tra layout, spacing, contrast
- Muốn cải thiện form, table, dashboard, landing page
- Muốn kiểm tra responsive design

### Prompt mẫu: review UI

```text
Hãy dùng skill `web-design-guidelines`.

Review giao diện web của project hiện tại. Kiểm tra layout, spacing, typography, contrast, responsive design, accessibility, form UX và consistency. Chỉ báo cáo vấn đề và đề xuất cải thiện, chưa chỉnh sửa file.
```

### Prompt mẫu: cải thiện UI

```text
Hãy dùng skill `web-design-guidelines`.

Cải thiện UI của project hiện tại theo web design guidelines. Ưu tiên accessibility, responsive layout, spacing, contrast và visual hierarchy. Không làm thay đổi business logic. Giải thích rõ từng file đã chỉnh sửa.
```

---

## 3.9. `writing-guidelines`

### Mục đích
Dùng để review hoặc cải thiện nội dung chữ trong docs, README, landing page, UI copy, hướng dẫn sử dụng hoặc thông báo lỗi.

### Dùng khi
- Review README
- Viết/cải thiện docs
- Sửa nội dung landing page
- Cải thiện UX writing
- Sửa microcopy trong form/button/error message
- Kiểm tra voice and tone

### Prompt mẫu: review tài liệu

```text
Hãy dùng skill `writing-guidelines`.

Review README/docs của project hiện tại. Kiểm tra độ rõ ràng, cấu trúc, giọng văn, tính nhất quán, hướng dẫn cài đặt/chạy project và các phần còn thiếu. Chỉ báo cáo vấn đề và đề xuất sửa, chưa chỉnh sửa file.
```

### Prompt mẫu: sửa nội dung

```text
Hãy dùng skill `writing-guidelines`.

Cải thiện nội dung README/docs/UI copy trong project hiện tại. Viết ngắn gọn, rõ ràng, dễ hiểu, phù hợp cho developer mới đọc project. Giữ nguyên ý nghĩa kỹ thuật và giải thích rõ từng file đã chỉnh sửa.
```

---

## 4. Prompt tổng hợp dùng cho mọi project

Dùng prompt này khi mới mở một project bất kỳ và muốn agent chọn skill phù hợp:

```text
Hãy kiểm tra project hiện tại và chọn skill Vercel phù hợp trong danh sách đã cài:

- vercel-composition-patterns
- deploy-to-vercel
- vercel-react-best-practices
- vercel-react-native-skills
- vercel-react-view-transitions
- vercel-cli-with-tokens
- vercel-optimize
- web-design-guidelines
- writing-guidelines

Mục tiêu: review project để phát hiện vấn đề kỹ thuật, UI, hiệu năng, deploy và tài liệu.

Yêu cầu:
- Trước tiên hãy cho biết bạn sẽ dùng skill nào và vì sao
- Kiểm tra các file quan trọng như package.json, config, source code, README/docs
- Chỉ báo cáo vấn đề và đề xuất sửa
- Chưa chỉnh sửa file
```

---

## 5. Prompt tổng hợp để agent sửa project

Dùng khi bạn muốn agent tự chọn skill và sửa luôn:

```text
Hãy kiểm tra project hiện tại và chọn skill Vercel phù hợp trong danh sách đã cài:

- vercel-composition-patterns
- deploy-to-vercel
- vercel-react-best-practices
- vercel-react-native-skills
- vercel-react-view-transitions
- vercel-cli-with-tokens
- vercel-optimize
- web-design-guidelines
- writing-guidelines

Mục tiêu: cải thiện project để dễ maintain, chạy ổn định và sẵn sàng deploy.

Yêu cầu:
- Trước khi sửa, hãy nêu skill sẽ dùng và kế hoạch chỉnh sửa
- Chỉ sửa những vấn đề có căn cứ rõ ràng
- Giữ thay đổi tối thiểu
- Không làm thay đổi business logic nếu không cần thiết
- Sau khi sửa, liệt kê file đã chỉnh sửa và lý do sửa
- Nếu có lệnh cần chạy, đưa lệnh rõ ràng cho Windows PowerShell
```

---

## 6. Bảng chọn skill nhanh

| Nhu cầu | Skill nên dùng |
|---|---|
| Review/tối ưu React hoặc Next.js | `vercel-react-best-practices` |
| Refactor component React | `vercel-composition-patterns` |
| Thêm animation chuyển page/component | `vercel-react-view-transitions` |
| Deploy lên Vercel | `deploy-to-vercel` |
| Deploy bằng token/CI/CD | `vercel-cli-with-tokens` |
| Tối ưu bill/usage/performance sau deploy | `vercel-optimize` |
| Review UI/UX/accessibility | `web-design-guidelines` |
| Review README/docs/UI copy | `writing-guidelines` |
| Project React Native/Expo | `vercel-react-native-skills` |

---

## 7. Quy trình khuyến nghị cho project mới

### Bước 1: Review kỹ thuật

```text
Hãy dùng skill `vercel-react-best-practices` để review project hiện tại. Chỉ báo cáo vấn đề, chưa chỉnh sửa file.
```

### Bước 2: Review UI

```text
Hãy dùng skill `web-design-guidelines` để review UI/UX/accessibility của project hiện tại. Chỉ báo cáo vấn đề, chưa chỉnh sửa file.
```

### Bước 3: Review deploy

```text
Hãy dùng skill `deploy-to-vercel` để kiểm tra project hiện tại đã sẵn sàng deploy lên Vercel chưa. Chưa deploy.
```

### Bước 4: Sửa có kiểm soát

```text
Dựa trên các vấn đề đã tìm được, hãy sửa từng nhóm lỗi theo mức độ ưu tiên. Giữ thay đổi tối thiểu, không làm đổi logic hiện tại, và giải thích rõ từng file đã sửa.
```

### Bước 5: Deploy hoặc tạo preview

```text
Hãy dùng skill `deploy-to-vercel` để tạo preview deployment cho project hiện tại. Trước khi deploy, chạy kiểm tra build nếu cần.
```

---

## 8. Câu lệnh cài skill theo project

Chạy trong root folder project:

```bash
npx skills add vercel-labs/agent-skills -a cursor
```

Xem danh sách skill:

```bash
npx skills add vercel-labs/agent-skills --list
```

Cài riêng một skill:

```bash
npx skills add vercel-labs/agent-skills --skill <ten-skill> -a cursor
```

Ví dụ:

```bash
npx skills add vercel-labs/agent-skills --skill vercel-react-best-practices -a cursor
```

---

## 9. Lưu ý khi dùng trong Cursor Agent

Nên ghi rõ:

```text
Hãy dùng skill `<tên-skill>`.
```

Nên yêu cầu agent kiểm tra trước khi sửa:

```text
Chỉ phân tích, chưa chỉnh sửa file.
```

Khi cho sửa, nên thêm ràng buộc:

```text
Giữ thay đổi tối thiểu, không làm thay đổi logic hiện tại, và giải thích rõ từng file đã chỉnh sửa.
```

Nếu agent không tự nhận skill, ép nó đọc file skill:

```text
Hãy đọc file SKILL.md của skill `<tên-skill>` trước, sau đó áp dụng vào project hiện tại.
```

Nếu cài theo project, thường skill nằm trong thư mục cấu hình của agent trong project. Nếu không chắc vị trí, tìm bằng:

```bash
Get-ChildItem -Recurse -Filter SKILL.md
```

---

## 10. Prompt ngắn dùng hằng ngày

### Review toàn project

```text
Hãy chọn skill Vercel phù hợp trong 9 skill đã cài để review project hiện tại. Chỉ báo cáo vấn đề và hướng sửa, chưa chỉnh sửa file.
```

### Sửa toàn project có kiểm soát

```text
Hãy chọn skill Vercel phù hợp trong 9 skill đã cài để cải thiện project hiện tại. Giữ thay đổi tối thiểu, không làm đổi logic hiện tại, và giải thích rõ từng file đã sửa.
```

### Check deploy

```text
Hãy dùng skill `deploy-to-vercel` để kiểm tra project hiện tại đã sẵn sàng deploy lên Vercel chưa. Chưa deploy.
```

### Check performance

```text
Hãy dùng skill `vercel-react-best-practices` để tìm vấn đề hiệu năng trong project React/Next.js hiện tại. Chưa chỉnh sửa file.
```

### Check UI

```text
Hãy dùng skill `web-design-guidelines` để review UI/UX/accessibility của project hiện tại. Chưa chỉnh sửa file.
```

### Check docs

```text
Hãy dùng skill `writing-guidelines` để review README/docs/UI copy của project hiện tại. Chưa chỉnh sửa file.
```
