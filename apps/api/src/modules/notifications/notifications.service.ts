import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import { Alert, AlertSeverity } from '@lifecycleiq/shared';

const SEVERITY_LABEL: Record<AlertSeverity, string> = {
  critical: '🔴 Critical (< 30 days)',
  high: '🟠 High (< 60 days)',
  medium: '🟡 Medium (< 90 days)',
  low: '⚪ Low (≤ 120 days)',
};

const SEVERITY_ORDER: AlertSeverity[] = ['critical', 'high', 'medium', 'low'];

@Injectable()
export class NotificationsService {
  private transporter: nodemailer.Transporter | null = null;

  constructor(private config: ConfigService) {}

  private getTransporter(): nodemailer.Transporter | null {
    const host = this.config.get<string>('SMTP_HOST');
    if (!host) return null;
    if (!this.transporter) {
      this.transporter = nodemailer.createTransport({
        host,
        port: this.config.get<number>('SMTP_PORT') ?? 587,
        auth: {
          user: this.config.get<string>('SMTP_USER'),
          pass: this.config.get<string>('SMTP_PASS'),
        },
      });
    }
    return this.transporter;
  }

  buildSubject(alerts: Alert[]): string {
    const n = alerts.length;
    return `[LifecycleIQ] ${n} alert${n === 1 ? '' : 's'} ${n === 1 ? 'requires' : 'require'} attention`;
  }

  buildHtml(alerts: Alert[]): string {
    let body = '<h2>LifecycleIQ — Alert Digest</h2>';
    for (const sev of SEVERITY_ORDER) {
      const group = alerts.filter(a => a.severity === sev);
      if (!group.length) continue;
      body += `<h3>${SEVERITY_LABEL[sev]}</h3><ul>`;
      for (const a of group) {
        body += `<li>${a.message}</li>`;
      }
      body += '</ul>';
    }
    body += '<p>Log in to LifecycleIQ to review and take action.</p>';
    return body;
  }

  buildText(alerts: Alert[]): string {
    let text = 'LifecycleIQ — Alert Digest\n' + '─'.repeat(30) + '\n\n';
    for (const sev of SEVERITY_ORDER) {
      const group = alerts.filter(a => a.severity === sev);
      if (!group.length) continue;
      text += `${SEVERITY_LABEL[sev]}\n`;
      for (const a of group) {
        text += `  • ${a.message}\n`;
      }
      text += '\n';
    }
    text += 'Log in to LifecycleIQ to review and take action.';
    return text;
  }

  async sendAlertDigest(alerts: Alert[]): Promise<void> {
    const transporter = this.getTransporter();
    if (!transporter) return;

    // Propagate SMTP errors so the cron job skips logging and retries next run
    await transporter.sendMail({
      from: this.config.get<string>('SMTP_FROM'),
      to: this.config.get<string>('ALERT_TO_EMAIL'),
      subject: this.buildSubject(alerts),
      html: this.buildHtml(alerts),
      text: this.buildText(alerts),
    });
  }
}
