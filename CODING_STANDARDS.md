# Dự án: Binary Translation Pipeline - Quy tắc phát triển

Bộ quy tắc này được thiết lập để ngăn chặn các lỗi lặp đi lặp lại liên quan đến TypeScript compilation và tính toàn vẹn của mã nguồn sau khi refactoring.

## 1. Tính toàn vẹn khi Refactoring (Refactoring Integrity)
- **Quy tắc**: Khi thay đổi Interface của một Component hoặc chữ ký của một Hook (tham số vào/ra), phải cập nhật ngay lập tức tất cả các tệp tin đang sử dụng chúng.
- **Kiểm tra**: Tìm kiếm toàn cục (Grep) tên Component/Hook đó để đảm bảo không bỏ sót nơi gọi nào.

## 2. Tuân thủ TypeScript nghiêm ngặt (Strict TypeScript)
- **Quy tắc**: Không để lại biến, tham số hoặc Import được khai báo nhưng không sử dụng (`noUnusedVars`). 
- **Quy tắc**: Tuyệt đối không để xảy ra lỗi `ReferenceError` do thiếu Import hoặc bóc tách dữ liệu (destructuring) không đầy đủ.
- **Lưu ý**: Chế độ `tsc && vite build` sẽ chặn đứng quy trình nếu vi phạm các điều này.

## 3. Quản lý Import và Dependency
- **Quy tắc**: Khi xóa một tính năng hoặc một đoạn mã, phải xóa kèm theo các `import` liên quan (Icons, Hooks, Types).
- **Quy tắc**: Luôn sử dụng `useMemo` hoặc `useCallback` cho các giá trị/hàm truyền xuống Component con để tránh re-render vô tận hoặc lỗi so sánh tham chiếu.

## 4. Quản lý Kiểu dữ liệu (Type Management)
- **Quy tắc**: Luôn ưu tiên dùng kiểu dữ liệu tường minh từ `useDictionary.ts` hoặc các tệp định nghĩa type.
- **Xử lý ngoại lệ**: Nếu gặp lỗi Namespace (như `JSX`), sử dụng `any[]` hoặc `React.ReactNode` để đảm bảo tính tương thích với trình biên dịch.

## 5. Vòng đời dữ liệu và Bộ nhớ (Memory Management)
- **Quy tắc**: Các tính năng tự động (như Auto-load Table) phải đi kèm với cơ chế giải phóng tương ứng (Unload/Cleanup).
- **Quy tắc**: Luôn kiểm tra Reference Counting để không xóa nhầm dữ liệu đang được dùng chung bởi nhiều Session.

---
**Cam kết**: Mọi phản hồi và thay đổi mã nguồn từ AI phải tự đối chiếu với 5 quy tắc trên trước khi gửi tới USER.
