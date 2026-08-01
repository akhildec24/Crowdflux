import React from 'react';
import { useStore } from '../store/useStore';

export function ReportModal() {
  const store = useStore();
  const report = store.report;
  if (!report) return null;

  return (
    <div className="report-modal" role="dialog" aria-label="Scenario report">
      <h2>Scenario Outcome Report</h2>
      <div className="report-grid">
        <div className="report-item">
          <div className="label">Max Crowd Density</div>
          <div className="value">{report.max_crowd_density.toFixed(2)}</div>
        </div>
        <div className="report-item">
          <div className="label">Avg Queue Time</div>
          <div className="value">{report.avg_queue_time.toFixed(1)}s</div>
        </div>
        <div className="report-item">
          <div className="label">Longest Queue Time</div>
          <div className="value">{report.longest_queue_time.toFixed(1)}s</div>
        </div>
        <div className="report-item">
          <div className="label">Exit Clearance Time</div>
          <div className="value">{report.exit_clearance_time.toFixed(1)}s</div>
        </div>
        <div className="report-item">
          <div className="label">Blocked Routes</div>
          <div className="value">{report.blocked_routes}</div>
        </div>
        <div className="report-item">
          <div className="label">Critical Density Events</div>
          <div className="value">{report.critical_density_events}</div>
        </div>
        <div className="report-item">
          <div className="label">Emergency Response Time</div>
          <div className="value">{report.emergency_response_time.toFixed(1)}s</div>
        </div>
        <div className="report-item">
          <div className="label">Avg Walking Distance</div>
          <div className="value">{report.avg_walking_distance.toFixed(1)}m</div>
        </div>
        <div className="report-item">
          <div className="label">Rerouted Visitors</div>
          <div className="value">{report.rerouted_visitors}</div>
        </div>
        <div className="report-item">
          <div className="label">Accessibility Issues</div>
          <div className="value">{report.accessibility_issues}</div>
        </div>
      </div>

      <div style={{ marginTop: 16 }}>
        <div className="label" style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: 1, color: 'var(--text-tertiary)', marginBottom: 8 }}>
          Operator Actions ({report.operator_actions.length})
        </div>
        <div style={{ maxHeight: 200, overflowY: 'auto' }}>
          {report.operator_actions.map((action, i) => (
            <div key={i} style={{ fontSize: 11, padding: '4px 0', borderBottom: '1px solid var(--border)', color: 'var(--text-secondary)' }}>
              <span style={{ color: 'var(--accent-blue)' }}>{action.user}</span> · {action.action} · {action.details}
            </div>
          ))}
        </div>
      </div>

      <button className="btn" style={{ marginTop: 16 }} onClick={() => store.setReport(null)}>
        Close Report
      </button>
    </div>
  );
}
