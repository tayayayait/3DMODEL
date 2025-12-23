import React from 'react';
import { useStore } from '../store';

const ContactForm = () => {
  return (
    <div className="panel info-panel info-panel-contact">
      <div className="panel-header">문의하기</div>
      <div className="panel-body">
        <input className="input-field" placeholder="이름" aria-label="이름" disabled />
        <input className="input-field" placeholder="이메일" aria-label="이메일" disabled />
      </div>
    </div>
  );
};

export const InfoPanel = () => {
  const rightPanelTab = useStore((state) => state.rightPanelTab);
  const setRightPanelTab = useStore((state) => state.setRightPanelTab);

  return (
    <aside className="right-panel" data-active-tab={rightPanelTab}>
      <div className="info-tabs" role="tablist" aria-label="정보 패널 탭">
        <button
          type="button"
          className={`chip ${rightPanelTab === 'company' ? 'is-active' : ''}`}
          onClick={() => setRightPanelTab('company')}
          aria-pressed={rightPanelTab === 'company'}
        >
          회사 소개
        </button>
        <button
          type="button"
          className={`chip ${rightPanelTab === 'contact' ? 'is-active' : ''}`}
          onClick={() => setRightPanelTab('contact')}
          aria-pressed={rightPanelTab === 'contact'}
        >
          문의하기
        </button>
      </div>

      <div className="panel info-panel info-panel-company">
        <div className="panel-header">회사 소개</div>
        <div className="panel-body">
          <p>
            컴퓨터 비전과 3D 센서 기반의 산업용 소프트웨어를 개발하여, 자동화와 지능형 시스템의 혁신을
            선도합니다.
          </p>
          <div className="info-list">
            <div className="info-row">
              <span className="info-label">대표</span>
              <span className="info-value">김서윤</span>
            </div>
            <div className="info-row">
              <span className="info-label">이메일</span>
              <span className="info-value">contact@novavision.ai</span>
            </div>
            <div className="info-row">
              <span className="info-label">사업자등록번호</span>
              <span className="info-value">123-45-67890</span>
            </div>
            <div className="info-row">
              <span className="info-label">주소</span>
              <span className="info-value">
                서울특별시 강남구 테헤란로 123, 12층 (삼성동, 노바타워)
              </span>
            </div>
          </div>
          <a className="info-link" href="#">
            전자공고공시
          </a>
          <div className="info-footer">ⓒ 2025 (주)노바비전. 모든 권리 보유.</div>
        </div>
      </div>

      <ContactForm />
    </aside>
  );
};
