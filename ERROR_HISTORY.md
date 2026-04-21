# Nhật ký lỗi và Bài học kinh nghiệm (Error History)

Tệp này ghi lại các lỗi đã gặp trong dự án để ngăn chặn việc lặp lại trong tương lai.

| Ngày | Loại lỗi | Chi tiết lỗi | Nguyên nhân & Bài học |
| :--- | :--- | :--- | :--- |
| 2026-04-21 | **Build Error** | `TS2322: Property 'pendingChecked' does not exist...` | **Lỗi đồng bộ Interface:** Sau khi dọn dẹp Interface ở Component con (`DetectionBanner`), quên cập nhật các Prop truyền xuống từ Component cha (`BulkTranslator`). -> *Bài học: Phải cập nhật call-sites ngay sau khi sửa Interface.* |
| 2026-04-21 | **ReferenceError** | `useMemo is not defined`, `isCollapsed is not defined` | **Thiếu Import/State:** Khi refactor lại Hook `useTableSelection`, vô tình xóa mất khai báo state hoặc quên import các hook của React. -> *Bài học: Luôn kiểm tra danh sách import và state sau khi "dọn dẹp" code.* |
| 2026-04-21 | **Build Error** | `TS2503: Cannot find namespace 'JSX'` | **Xung đột Namespace:** Môi trường Build không nhận diện được kiểu dữ liệu `JSX.Element` toàn cục. -> *Bài học: Sử dụng `any[]` hoặc `React.ReactNode` cho các mảng chứa element để tăng tính tương thích.* |
| 2026-04-21 | **Build Error** | `TS6133: 'useCallback' is declared but never read` | **Code thừa (Dead Code):** Sau khi xóa logic cũ, không xóa các hàm và import liên quan. -> *Bài học: Phải xóa sạch các tham chiếu cũ để vượt qua chế độ kiểm tra nghiêm ngặt của `tsc`.* |
| 2026-04-21 | **ReferenceError** | `addAutoSelection is not defined` in `App.tsx` | **Thiếu bóc tách dữ liệu (Destructuring):** Cập nhật Hook trả về giá trị mới nhưng không cập nhật phần bóc tách dữ liệu ở nơi sử dụng. -> *Bài học: Phải cập nhật file cha ngay khi thay đổi giá trị trả về của Hook.* |

---
*Ghi chú: Mỗi khi gặp lỗi Build hoặc Runtime mới, AI phải cập nhật thêm một dòng vào bảng này.*
