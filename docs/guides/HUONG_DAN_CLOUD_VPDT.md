# Huong dan theo doi VPDT 3 gio/lan khi may tinh tat

## Muc tieu
- Khong can mo may ca nhan van theo doi duoc van ban den moi.
- Quet moi 3 gio mot lan.
- Khi co van ban moi, gui thong tin co ban qua Telegram.

## Kien truc
- GitHub Actions chay script `cloud-check-vpdt.js` theo lich `0 */3 * * *`.
- Script dang nhap `vpdt.dongthap.gov.vn`, lay danh sach van ban hien co.
- So sanh voi state trong `state/known-vanban.json` de phat hien van ban moi.
- Gui Telegram qua bot token/chat id.
- Sau moi lan quet, workflow commit lai state de lan sau khong bao trung.

## 1) Tao GitHub Secrets
Vao repository -> Settings -> Secrets and variables -> Actions -> New repository secret.

Can tao 4 secrets:
- `VPDT_USERNAME`
- `VPDT_PASSWORD`
- `TELEGRAM_BOT_TOKEN`
- `TELEGRAM_CHAT_ID`

## 2) Bat workflow
- Vao tab Actions.
- Chon workflow `VPDT Cloud Check`.
- Bam `Run workflow` de chay thu ngay.

## 3) Kiem tra ket qua
- Neu khong co van ban moi: log hien `Khong co van ban moi.`
- Neu co van ban moi: bot Telegram gui tung van ban (so hieu, ngay, co quan, trich yeu).
- File `state/known-vanban.json` duoc cap nhat sau moi lan chay thanh cong.

## Luu y
- Neu trang VPDT thay doi giao dien dang nhap/table, can cap nhat selector trong `cloud-check-vpdt.js`.
- Chay cloud thi khong tai file dinh kem ve may ban. Muc tieu ban dau la canh bao som van ban moi.
- Neu can tai file dinh kem tu dong tren cloud, can bo sung luu tru va xu ly download rieng.
