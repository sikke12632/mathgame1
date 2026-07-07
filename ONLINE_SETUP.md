# 도형 게임 온라인 배포 안내

이 버전은 `Firebase Realtime Database`를 서버처럼 사용하고, `GitHub Pages`로 정적 파일을 배포하는 구조입니다.

## 1. Firebase 프로젝트 만들기

1. [Firebase Console](https://console.firebase.google.com/)에 접속합니다.
2. `프로젝트 추가`를 누릅니다.
3. 프로젝트 이름을 정합니다. 예: `shape-territory-war`
4. Google Analytics는 꺼도 됩니다.
5. 프로젝트 생성을 완료합니다.

## 2. 웹 앱 등록하기

1. Firebase 프로젝트 화면에서 `웹` 아이콘을 누릅니다.
2. 앱 닉네임을 입력합니다. 예: `도형 게임`
3. `앱 등록`을 누릅니다.
4. 화면에 나오는 `firebaseConfig` 값을 복사합니다.

## 3. Realtime Database 만들기

1. 왼쪽 메뉴에서 `빌드 > Realtime Database`로 갑니다.
2. `데이터베이스 만들기`를 누릅니다.
3. 위치는 가까운 곳을 고릅니다.
4. 처음에는 테스트 모드로 시작해도 됩니다.

## 4. Database Rules 넣기

수업용 간단 버전은 로그인 없이 방 코드만 사용하므로 아래처럼 설정합니다.

```json
{
  "rules": {
    "shapeTerritoryRooms": {
      ".read": true,
      ".write": true
    }
  }
}
```

주의: 이 규칙은 수업용 공개 방에 맞춘 간단 설정입니다. 학생 이름이나 개인정보를 넣지 마세요. 이 게임은 랜덤 동물 닉네임만 저장합니다.

## 5. firebase-config.js 수정하기

`firebase-config.js` 파일을 열고 아래 부분을 Firebase 콘솔에서 받은 값으로 바꿉니다.

```js
window.SHAPE_TERRITORY_FIREBASE_CONFIG = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_PROJECT_ID.firebaseapp.com",
  databaseURL: "https://YOUR_PROJECT_ID-default-rtdb.firebaseio.com",
  projectId: "YOUR_PROJECT_ID",
  appId: "YOUR_APP_ID",
};
```

중요: `databaseURL`이 꼭 있어야 합니다. Firebase 콘솔의 Realtime Database 주소와 일치해야 합니다.

## 6. GitHub에 올리기

1. GitHub에서 새 repository를 만듭니다.
2. 이 폴더의 파일을 업로드합니다.
   - `index.html`
   - `styles.css`
   - `gameCore.js`
   - `app.js`
   - `firebase-config.js`
3. `README.md`와 `ONLINE_SETUP.md`도 같이 올리면 관리하기 좋습니다.

## 7. GitHub Pages 켜기

1. GitHub repository에서 `Settings`로 갑니다.
2. 왼쪽 메뉴에서 `Pages`를 누릅니다.
3. `Build and deployment`에서 `Deploy from a branch`를 선택합니다.
4. Branch는 `main`, 폴더는 `/root`를 선택합니다.
5. 저장 후 몇 분 기다립니다.
6. 표시되는 GitHub Pages 주소로 접속합니다.

## 8. 수업에서 사용하는 방법

1. 학생 A가 GitHub Pages 주소에 접속합니다.
2. 설정을 고른 뒤 `온라인 방 만들기`를 누릅니다.
3. 화면에 나온 방 코드를 학생 B에게 알려줍니다.
4. 학생 B가 같은 주소에 접속합니다.
5. `방 코드로 입장`에 코드를 입력하고 `입장`을 누릅니다.
6. 각 학생은 랜덤 동물 닉네임을 받습니다.
7. 자기 차례인 학생만 문제 풀기와 색칠을 할 수 있습니다.

## 9. 현재 온라인 버전의 범위

구현됨:

- 온라인 방 만들기
- 방 코드 입장
- 랜덤 동물 닉네임
- Firebase 실시간 동기화
- 자기 차례에만 조작 가능
- 상대 차례에는 관전
- 기존 로컬 2인 모드 유지

아직 구현하지 않음:

- 로그인
- 교사용 관리 화면
- 방 목록
- 학급 랭킹
- 장기 기록 저장
- 접속 끊김 자동 복구 안내

## 10. 문제가 생길 때 확인할 것

- 온라인 버튼이 비활성화됨: `firebase-config.js` 값이 아직 `YOUR_...` 상태입니다.
- 방 입장이 안 됨: Firebase Realtime Database Rules가 저장되었는지 확인하세요.
- GitHub Pages에서만 안 됨: repository에 `firebase-config.js`가 같이 올라갔는지 확인하세요.
- 로컬 파일에서는 되는데 학생 기기에서 안 됨: GitHub Pages 주소로 접속하게 하세요. 학생에게 `file://` 경로를 줄 필요는 없습니다.
