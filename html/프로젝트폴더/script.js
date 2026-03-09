/* =========================================================
   U-Check 메인페이지 랭킹 렌더링 스크립트

   이 파일 역할:
   1. ranking.json 파일 읽기
   2. 실시간 랭킹 카드 생성
   3. 하루 이슈 카드 생성
   4. 화면에 자동으로 삽입

   중요:
   - 지금은 ranking.json을 읽음
   - 나중에 자동 수집 구조 붙이면 JSON만 갱신하면 됨
   - 더 나중에 서버 붙이면 fetch 주소만 바꾸면 됨
   ========================================================= */

/* =========================
   1. HTML 특수문자 안전 처리 함수
   - 제목 등에 특수문자가 들어와도 깨지거나 문제 생기는 걸 줄임
   - 나중에 외부 데이터 들어올 때를 대비한 기본 방어
   ========================= */
function escapeHtml(value = "") {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

/* =========================
   2. 랭킹 카드 하나를 HTML 문자열로 만드는 함수
   매개변수:
   - sectionData: realtime 또는 issue 데이터 묶음
   예시:
   {
     title: "실시간 급상승 랭킹",
     moreLink: "realtime.html",
     items: [...]
   }
   ========================= */
function createRankingCard(sectionData) {
  // 데이터가 없을 경우 대비
  if (!sectionData || !Array.isArray(sectionData.items) || sectionData.items.length === 0) {
    return `
      <div class="status-box error">
        랭킹 데이터를 불러오지 못했습니다.
      </div>
    `;
  }

  /* 1위 데이터 찾기
     - rank가 1인 항목 우선 사용
     - 없으면 첫 번째 항목을 1위처럼 사용 */
  const featuredItem =
    sectionData.items.find(item => item.rank === 1) || sectionData.items[0];

  /* 2~5위 목록 만들기
     - rank가 2 이상인 항목만 사용
     - 최대 4개만 표시 */
  const subItems = sectionData.items
    .filter(item => item.rank !== 1)
    .slice(0, 4);

  /* 2~5위 리스트 HTML 생성 */
  const subItemsHtml = subItems.map(item => {
    return `
      <li>
        <a href="${escapeHtml(item.link || "#")}" class="rank-item">
          <span class="rank-number">${escapeHtml(item.rank)}</span>
          <span class="rank-text">
            <span class="rank-headline">${escapeHtml(item.title)}</span>
            <span class="rank-meta">${escapeHtml(item.meta || "")}</span>
          </span>
        </a>
      </li>
    `;
  }).join("");

  /* 카드 전체 HTML 반환 */
  return `
    <article class="ranking-card">
      <div class="ranking-card-header">
        <h2 class="ranking-card-title">${escapeHtml(sectionData.title)}</h2>
        <a href="${escapeHtml(sectionData.moreLink || "#")}" class="more-link">더보기</a>
      </div>

      <div class="ranking-card-body">
        <!-- 1위 크게 노출 -->
        <div class="featured-rank">
          <a href="${escapeHtml(featuredItem.link || "#")}" class="featured-thumb">
            <span class="rank-badge">1위</span>
            <img
              src="${escapeHtml(featuredItem.image || "https://via.placeholder.com/800x450?text=No+Image")}"
              alt="${escapeHtml(featuredItem.title || "랭킹 대표 이미지")}"
            />
          </a>

          <a href="${escapeHtml(featuredItem.link || "#")}" class="featured-title">
            ${escapeHtml(featuredItem.title)}
          </a>

          <p class="featured-desc">
            ${escapeHtml(featuredItem.desc || "")}
          </p>
        </div>

        <!-- 2~5위 텍스트 리스트 -->
        <ul class="rank-list">
          ${subItemsHtml}
        </ul>
      </div>
    </article>
  `;
}

/* =========================
   3. 상태 메시지 출력 함수
   - 로딩중 / 에러 등을 표시할 때 사용
   ========================= */
function renderStatus(targetId, message, isError = false) {
  const target = document.getElementById(targetId);
  if (!target) return;

  target.innerHTML = `
    <div class="status-box ${isError ? "error" : ""}">
      ${escapeHtml(message)}
    </div>
  `;
}

/* =========================
   4. 실제 데이터 불러와서 화면에 넣는 메인 함수
   ========================= */
async function loadRankingData() {
  // 데이터 들어갈 영역 DOM 가져오기
  const realtimeContainer = document.getElementById("realtime-ranking-container");
  const issueContainer = document.getElementById("issue-ranking-container");

  // 혹시 해당 영역이 없으면 실행 중단
  if (!realtimeContainer || !issueContainer) return;

  // 로딩 표시
  renderStatus("realtime-ranking-container", "실시간 급상승 랭킹 불러오는 중...");
  renderStatus("issue-ranking-container", "하루 이슈 랭킹 불러오는 중...");

  try {
    /* -----------------------------------------
       지금은 ranking.json 파일을 읽음
       나중에 서버 붙이면 이 줄만 바꿀 가능성이 큼
       예:
       const response = await fetch('/api/ranking');
       ----------------------------------------- */
    const response = await fetch("./ranking.json");

    // 응답이 실패한 경우
    if (!response.ok) {
      throw new Error(`HTTP 오류: ${response.status}`);
    }

    // JSON 파싱
    const data = await response.json();

    // 각각 카드 HTML 생성 후 삽입
    realtimeContainer.innerHTML = createRankingCard(data.realtime);
    issueContainer.innerHTML = createRankingCard(data.issue);

  } catch (error) {
    console.error("랭킹 데이터 로딩 실패:", error);

    // 사용자 화면에 에러 표시
    renderStatus(
      "realtime-ranking-container",
      "실시간 급상승 랭킹을 불러오지 못했습니다.",
      true
    );

    renderStatus(
      "issue-ranking-container",
      "하루 이슈 랭킹을 불러오지 못했습니다.",
      true
    );
  }
}

/* =========================
   5. 페이지 로드 완료 후 실행
   ========================= */
document.addEventListener("DOMContentLoaded", loadRankingData);