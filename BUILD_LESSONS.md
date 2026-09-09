# Những sai sót và bài học khi Build APK với Capacitor và GitHub Actions (Ngày 08/09/2026)

Dưới đây là tài liệu ghi chú lại toàn bộ các vấn đề đã gặp phải và cách giải quyết triệt để khi đóng gói ứng dụng React (Vite) thành file APK dành cho Android thông qua hệ thống CI/CD của GitHub Actions.

## 1. Lỗi thiếu `package-lock.json`
- **Hiện tượng:** Ở bước `Setup Node.js`, GitHub Actions báo lỗi: `Error: Dependencies lock file is not found...`.
- **Nguyên nhân:** Môi trường AI Studio mặc định sử dụng Bun (tạo file `bun.lock`), trong khi GitHub Actions mặc định tìm `package-lock.json` hoặc `yarn.lock` để chạy cơ chế `cache: 'npm'`.
- **Cách khắc phục:**
  - **Cách 1:** Chạy lệnh `npm install` cục bộ trước khi đẩy code lên để sinh ra `package-lock.json`.
  - **Cách 2 (Triệt để trên GitHub):** Sửa file `.github/workflows/build-apk.yml`, xoá dòng `cache: 'npm'` ở bước `Setup Node.js`.

## 2. Lỗi `npm error could not determine executable to run` ở bước Sync Capacitor
- **Hiện tượng:** Bước `Sync Capacitor Android` bị lỗi (Exit code 1).
- **Nguyên nhân:** Dự án chưa được cài đặt lõi Capacitor (`@capacitor/core`, `@capacitor/cli`, `@capacitor/android`) và chưa có cấu hình `capacitor.config.ts`. Lệnh `npx cap sync android` bị thất bại vì không tìm thấy module.
- **Cách khắc phục:**
  - Thêm một bước khởi tạo (Setup Capacitor) vào trước bước Build Web App trong file workflow:
    ```yaml
    - name: Setup Capacitor
      run: |
        npm install @capacitor/core@6
        npm install -D @capacitor/cli@6 @capacitor/android@6
        npx cap init "Tên Ứng Dụng" "com.ten.ungdung" --web-dir dist
        npx cap add android
    ```

## 3. Lỗi xung đột môi trường Gradle và Android SDK
- **Hiện tượng:** Bước `Build Debug APK` bị thất bại (`BUILD FAILED in...`).
- **Nguyên nhân:** Phiên bản Capacitor quá mới tự động thiết lập dự án Android sử dụng Gradle bản cao (ví dụ: 8.13.0) và Android SDK mới nhất (36), trong khi môi trường Java trên GitHub (Java 17) không tương thích, gây ra sự đứt gãy trong quá trình biên dịch.
- **Cách khắc phục:** 
  - Phải hạ cấp cấu hình Android trong `android/build.gradle` (hạ Gradle xuống 8.2.1) và `android/variables.gradle` (hạ `compileSdkVersion` / `targetSdkVersion` xuống 34).
  - Hoặc đồng bộ hóa bằng cách sử dụng phiên bản Capacitor phù hợp.

## 4. Lỗi `invalid source release: 21`
- **Hiện tượng:** Quá trình build thất bại với thông báo lỗi rõ ràng yêu cầu mã nguồn phải là 21.
- **Nguyên nhân:** Lõi của Capacitor (hoặc các thư viện ngầm của nó) yêu cầu biên dịch bằng **Java 21**, nhưng GitHub Actions lại đang cấu hình chạy **Java 17**.
- **Cách khắc phục:** 
  - Sửa file `.github/workflows/build-apk.yml`, tìm bước `Setup Java` và đổi `java-version: '17'` thành `java-version: '21'`.

## Cấu hình `build-apk.yml` Chuẩn Nhất (Đã được kiểm chứng thành công 100%)
Để tránh mọi lỗi trên, đây là file cấu hình cuối cùng được sử dụng:

```yaml
name: Build APK

on:
  push:
    branches:
      - main
  workflow_dispatch:

jobs:
  build:
    runs-on: ubuntu-latest

    steps:
      - name: Checkout source code
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'

      - name: Setup Java 21
        uses: actions/setup-java@v3
        with:
          distribution: 'zulu'
          java-version: '21'

      - name: Install dependencies
        run: npm install

      - name: Setup Capacitor
        run: |
          npm install @capacitor/core@6
          npm install -D @capacitor/cli@6 @capacitor/android@6
          npx cap init "VOV Radio" "com.vov.radio" --web-dir dist
          npx cap add android

      - name: Build Web App (Vite)
        run: npm run build

      - name: Sync Capacitor Android
        run: npx cap sync android

      - name: Build Debug APK
        working-directory: ./android
        run: ./gradlew assembleDebug
        
      - name: Upload APK Artifact
        uses: actions/upload-artifact@v4
        with:
          name: app-debug
          path: android/app/build/outputs/apk/debug/app-debug.apk
```
