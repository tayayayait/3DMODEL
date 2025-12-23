import React, { useEffect, useState } from 'react';
import { ChevronRight, ChevronLeft, Plus, Trash2 } from 'lucide-react';
import { useStore, ROI_DEFAULT_MIN, ROI_DEFAULT_MAX } from '../store';

export const ROIPanel = () => {
  const panelMode = useStore((state) => state.panelMode);
  const setPanelMode = useStore((state) => state.setPanelMode);
  const pointSize = useStore((state) => state.pointSize);
  const setPointSize = useStore((state) => state.setPointSize);
  const colorMapMode = useStore((state) => state.colorMapMode);
  const setColorMapMode = useStore((state) => state.setColorMapMode);
  const colorMapType = useStore((state) => state.colorMapType);
  const setColorMapType = useStore((state) => state.setColorMapType);
  const cameraMode = useStore((state) => state.cameraMode);
  const setCameraMode = useStore((state) => state.setCameraMode);
  const viewPreset = useStore((state) => state.viewPreset);
  const setViewPreset = useStore((state) => state.setViewPreset);
  const isLeftPanelOpen = useStore((state) => state.isLeftPanelOpen);
  const toggleLeftPanel = useStore((state) => state.toggleLeftPanel);
  const roiItems = useStore((state) => state.roiItems);
  const roiMode = useStore((state) => state.roiMode);
  const roiDraftType = useStore((state) => state.roiDraftType);
  const roiDraftPoints = useStore((state) => state.roiDraftPoints);
  const startRoi = useStore((state) => state.startRoi);
  const requestRoiHeight = useStore((state) => state.requestRoiHeight);
  const cancelRoiDraft = useStore((state) => state.cancelRoiDraft);
  const confirmRoiDraft = useStore((state) => state.confirmRoiDraft);
  const removeRoi = useStore((state) => state.removeRoi);
  const clearRoi = useStore((state) => state.clearRoi);

  const orderedRoi = [
    ...roiItems.filter((item) => item.type === 'positive'),
    ...roiItems.filter((item) => item.type === 'negative')
  ];

  const [draftMin, setDraftMin] = useState(ROI_DEFAULT_MIN);
  const [draftMax, setDraftMax] = useState(ROI_DEFAULT_MAX);

  useEffect(() => {
    if (roiMode === 'height') {
      setDraftMin(ROI_DEFAULT_MIN);
      setDraftMax(ROI_DEFAULT_MAX);
    }
  }, [roiMode]);

  const draftLabel = roiDraftType === 'negative' ? 'Negative ROI' : 'Positive ROI';
  const draftRangeLabel = `${draftMin.toFixed(1)}m ~ ${draftMax.toFixed(1)}m`;

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (roiMode === 'drawing' && event.key === 'Enter') {
        event.preventDefault();
        requestRoiHeight();
        return;
      }
      if (roiMode === 'height' && event.key === 'Enter') {
        event.preventDefault();
        confirmRoiDraft(draftMin, draftMax);
        return;
      }
      if (roiMode !== 'idle' && event.key === 'Escape') {
        event.preventDefault();
        cancelRoiDraft();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [roiMode, requestRoiHeight, cancelRoiDraft, confirmRoiDraft, draftMin, draftMax]);

  return (
    <aside className={`left-panel panel ${isLeftPanelOpen ? '' : 'is-collapsed'}`} data-mode={panelMode}>
      <div className="panel-header">
        <span>{panelMode === 'roi' ? 'ROI 관리' : '뷰 옵션'}</span>
        <button
          className="icon-button"
          type="button"
          onClick={toggleLeftPanel}
          aria-label="좌측 패널 토글"
          aria-expanded={isLeftPanelOpen}
        >
          {isLeftPanelOpen ? <ChevronLeft size={16} /> : <ChevronRight size={16} />}
        </button>
      </div>
      <div className="panel-tabs">
        <button
          className={`btn ${panelMode === 'view' ? 'btn-accent' : ''}`}
          onClick={() => setPanelMode('view')}
          aria-pressed={panelMode === 'view'}
        >
          View <ChevronRight size={16} />
        </button>
        <button
          className={`btn ${panelMode === 'roi' ? 'btn-accent' : ''}`}
          onClick={() => setPanelMode('roi')}
          aria-pressed={panelMode === 'roi'}
        >
          ROI <ChevronRight size={16} />
        </button>
      </div>
      <div className="panel-scroll scrollbar">
        <section className="panel-section roi-section">
          <div className="roi-actions">
            <button className="btn btn-accent" type="button" onClick={() => startRoi('positive')}>
              <Plus size={14} /> Positive ROI 추가
            </button>
            <button className="btn btn-danger" type="button" onClick={() => startRoi('negative')}>
              <Plus size={14} /> Negative ROI 추가
            </button>
          </div>

          {roiMode === 'height' ? (
            <div className="roi-height-card">
              <div className="roi-height-meta">
                <span className="roi-height-title">{draftLabel}</span>
                <span>•</span>
                <span>{roiDraftPoints.length} Points</span>
                <span>•</span>
                <span>{draftRangeLabel}</span>
              </div>
              <div className="section-title">높이 조정</div>
              <div className="section-row">
                <span className="text-dim">바닥</span>
                <span className="value-chip">{draftMin.toFixed(1)} m</span>
              </div>
              <input
                className="range"
                type="range"
                min={ROI_DEFAULT_MIN}
                max={ROI_DEFAULT_MAX}
                step={0.1}
                value={draftMin}
                onChange={(event) => {
                  const next = parseFloat(event.target.value);
                  setDraftMin(Math.min(next, draftMax));
                }}
                aria-label="바닥 높이"
              />

              <div className="section-divider" />

              <div className="section-row">
                <span className="text-dim">천장</span>
                <span className="value-chip">{draftMax.toFixed(1)} m</span>
              </div>
              <input
                className="range"
                type="range"
                min={ROI_DEFAULT_MIN}
                max={ROI_DEFAULT_MAX}
                step={0.1}
                value={draftMax}
                onChange={(event) => {
                  const next = parseFloat(event.target.value);
                  setDraftMax(Math.max(next, draftMin));
                }}
                aria-label="천장 높이"
              />

              <div className="section-row text-dim">
                <span>높이 범위</span>
                <span>{(draftMax - draftMin).toFixed(1)} m</span>
              </div>

              <div className="roi-height-actions">
                <button className="btn btn-ghost" type="button" onClick={cancelRoiDraft}>
                  취소 (ESC)
                </button>
                <button className="btn btn-accent" type="button" onClick={() => confirmRoiDraft(draftMin, draftMax)}>
                  확인 (Enter)
                </button>
              </div>
            </div>
          ) : null}

          <div className="section-title">Positive ROI</div>
          <div className="section-subtitle">포인트: {roiDraftPoints.length} / 최소 3개</div>

          <div className="roi-grid">
            {orderedRoi.map((item) => (
              <div key={item.id} className={`roi-card ${item.type}`}>
                <div>
                  <div className="roi-label">{item.label}</div>
                  <div className="roi-range">{item.range}</div>
                </div>
                <button
                  className="roi-delete"
                  type="button"
                  onClick={() => removeRoi(item.id)}
                  aria-label="ROI 삭제"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
          </div>

          <button className="btn btn-danger roi-reset" type="button" onClick={clearRoi}>
            <Trash2 size={16} /> 모든 ROI 삭제
          </button>
        </section>

        <section className="panel-section view-section">
          <div className="section-title">포인트 클라우드</div>
          <div className="section-row">
            <span className="text-dim">포인트 크기</span>
            <span className="value-chip">{pointSize.toFixed(1)}</span>
          </div>
          <input
            className="range"
            type="range"
            min={1}
            max={10}
            step={0.1}
            value={pointSize}
            onChange={(event) => setPointSize(parseFloat(event.target.value))}
            aria-label="포인트 크기"
          />

          <div className="section-divider" />

          <div className="section-title">컬러맵</div>
          <div className="toggle-row">
            <button
              type="button"
              className={`chip ${colorMapMode === 'height' ? 'is-active' : ''}`}
              onClick={() => setColorMapMode('height')}
              aria-pressed={colorMapMode === 'height'}
            >
              높이
            </button>
            <button
              type="button"
              className={`chip ${colorMapMode === 'depth' ? 'is-active' : ''}`}
              onClick={() => setColorMapMode('depth')}
              aria-pressed={colorMapMode === 'depth'}
            >
              깊이
            </button>
          </div>

          <div className="section-title">컬러맵 타입</div>
          <div className="toggle-row">
            <button
              type="button"
              className={`chip ${colorMapType === 'jet' ? 'is-active' : ''}`}
              onClick={() => setColorMapType('jet')}
              aria-pressed={colorMapType === 'jet'}
            >
              Jet
            </button>
            <button
              type="button"
              className={`chip ${colorMapType === 'viridis' ? 'is-active' : ''}`}
              onClick={() => setColorMapType('viridis')}
              aria-pressed={colorMapType === 'viridis'}
            >
              Viridis
            </button>
            <button
              type="button"
              className={`chip ${colorMapType === 'plasma' ? 'is-active' : ''}`}
              onClick={() => setColorMapType('plasma')}
              aria-pressed={colorMapType === 'plasma'}
            >
              Plasma
            </button>
          </div>

          <div className="section-divider" />

          <div className="section-title">카메라</div>
          <div className="toggle-row">
            <button
              type="button"
              className={`chip ${cameraMode === 'perspective' ? 'is-active' : ''}`}
              onClick={() => setCameraMode('perspective')}
              aria-pressed={cameraMode === 'perspective'}
            >
              원근
            </button>
            <button
              type="button"
              className={`chip ${cameraMode === 'orthographic' ? 'is-active' : ''}`}
              onClick={() => setCameraMode('orthographic')}
              aria-pressed={cameraMode === 'orthographic'}
            >
              직교
            </button>
          </div>

          <div className="toggle-row">
            <button
              type="button"
              className={`chip ${viewPreset === 'reset' ? 'is-active' : ''}`}
              onClick={() => setViewPreset('reset')}
              aria-pressed={viewPreset === 'reset'}
            >
              리셋
            </button>
            <button
              type="button"
              className={`chip ${viewPreset === 'top' ? 'is-active' : ''}`}
              onClick={() => setViewPreset('top')}
              aria-pressed={viewPreset === 'top'}
            >
              탑뷰
            </button>
            <button
              type="button"
              className={`chip ${viewPreset === 'side' ? 'is-active' : ''}`}
              onClick={() => setViewPreset('side')}
              aria-pressed={viewPreset === 'side'}
            >
              측면
            </button>
            <button
              type="button"
              className={`chip ${viewPreset === 'front' ? 'is-active' : ''}`}
              onClick={() => setViewPreset('front')}
              aria-pressed={viewPreset === 'front'}
            >
              정면
            </button>
          </div>
        </section>
      </div>
    </aside>
  );
};
