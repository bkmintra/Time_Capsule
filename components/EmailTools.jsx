"use client";
import {useActionState, useState} from 'react';
import {Mail, KeyRound, ChevronDown, ChevronUp} from 'lucide-react';
import {emailRequest, emailConfirm} from '@/app/actions';
import {Feedback, Password, Field, Submit} from './FormBits';

function EmailForm({id, purpose}){
  const [isOpen, setIsOpen] = useState(false);
  const [request, send, sending] = useActionState(emailRequest.bind(null, id, purpose), {});
  const [result, confirm, pending] = useActionState(emailConfirm.bind(null, id, purpose), {});

  return (
    <details
      className="email-panel"
      open={isOpen}
      onToggle={(e) => setIsOpen(e.currentTarget.open)}
    >
      <summary className="email-panel-summary">
        <div className="summary-left">
          <span className="summary-icon">
            {purpose === 'reset' ? <KeyRound size={18} /> : <Mail size={18} />}
          </span>
          <span className="summary-title">
            {purpose === 'reset' ? 'ลืมรหัสผ่านแคปซูล' : 'รับอีเมลเมื่อถึงเวลาเปิด'}
          </span>
        </div>
        <span className="panel-toggle-icon" aria-label={isOpen ? 'พับเก็บ' : 'เปิดหน้าต่าง'}>
          <ChevronDown size={20} className={`toggle-chevron ${isOpen ? 'rotated' : ''}`} />
        </span>
      </summary>

      <div className="email-panel-content">
        <p className="panel-desc">ยืนยันผ่านอีเมลของบัญชีคุณ รหัสมีอายุ 10 นาทีและใช้ได้ครั้งเดียว</p>
        
        <form action={send} className="email-send-form">
          <Feedback state={request} />
          <button className="button secondary" disabled={sending}>
            {sending ? 'กำลังส่ง…' : 'ส่งรหัสยืนยันทางอีเมล'}
          </button>
        </form>

        <form action={confirm} className="email-confirm-form">
          <Feedback state={result} />
          {!result.done && (
            <fieldset disabled={pending}>
              <Field name={`${purpose}-code`} label="รหัสยืนยันจากอีเมล">
                <input
                  id={`${purpose}-code`}
                  name="code"
                  inputMode="numeric"
                  pattern="[0-9]{8}"
                  maxLength={8}
                  autoComplete="one-time-code"
                  placeholder="กรอกรหัส 8 หลัก"
                  required
                />
              </Field>
              {purpose === 'reset' && (
                <>
                  <Field name="recovery-password" label="รหัสผ่านแคปซูลใหม่">
                    <Password id="recovery-password" />
                  </Field>
                  <Field name="recovery-confirm" label="ยืนยันรหัสผ่านใหม่">
                    <Password id="recovery-confirm" name="confirm" />
                  </Field>
                </>
              )}
              <Submit pending={pending}>
                {purpose === 'reset' ? 'ตั้งรหัสผ่านใหม่' : 'ยืนยันรับการแจ้งเตือน'}
              </Submit>
            </fieldset>
          )}
        </form>

        <div className="panel-footer-actions">
          <small className="panel-note">
            การตั้งรหัสใหม่ไม่เปลี่ยนเจ้าของหรือวันเปิดแคปซูล
          </small>
          <button
            type="button"
            className="collapse-bottom-btn"
            onClick={() => setIsOpen(false)}
          >
            <ChevronUp size={14} /> พับเก็บหน้าต่างนี้
          </button>
        </div>
      </div>
    </details>
  );
}

export default function EmailTools({id}){
  return (
    <section className="email-tools" aria-label="อีเมลและการกู้รหัส">
      <EmailForm id={id} purpose="notify" />
      <EmailForm id={id} purpose="reset" />
    </section>
  );
}

