// Inline "send a message" form for the `mail` command. No backend, no third
// party: submitting just builds a mailto: link and hands it to the visitor's
// own email client — the message is never transmitted by this page itself.

export function buildMailForm(toEmail, onSubmitted) {
  const wrap = document.createElement("div");
  wrap.className = "mail-form-wrap";

  const form = document.createElement("form");
  form.className = "mail-form";
  form.innerHTML = `
    <div class="mail-form-title">Send Sumit a message</div>
    <label class="mail-form-field">
      <span>Your email</span>
      <input type="email" name="from" required autocomplete="email" />
    </label>
    <label class="mail-form-field">
      <span>Subject</span>
      <input type="text" name="subject" required />
    </label>
    <label class="mail-form-field">
      <span>Message</span>
      <textarea name="message" rows="4" required></textarea>
    </label>
    <div class="mail-form-actions">
      <button type="submit">Send</button>
      <span class="mail-form-hint">Opens your email client, pre-filled — nothing leaves this page.</span>
    </div>
  `;

  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const from = form.elements.from.value.trim();
    const subject = form.elements.subject.value.trim();
    const message = form.elements.message.value.trim();
    const body = `${message}\n\n— from ${from}`;
    const mailto = `mailto:${toEmail}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    window.location.href = mailto;

    const status = document.createElement("div");
    status.className = "mail-form-status";
    status.textContent = "Opened your email client with this pre-filled — hit send from there to reach Sumit.";
    form.replaceWith(status);

    if (onSubmitted) onSubmitted();
  });

  wrap.appendChild(form);
  return wrap;
}
