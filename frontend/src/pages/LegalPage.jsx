import { Link } from 'react-router-dom';

const Icon = ({ d, className = 'w-4 h-4', strokeWidth = 1.9 }) => (
    <svg className={className} fill="none" stroke="currentColor" strokeWidth={strokeWidth}
        strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
        <path d={d} />
    </svg>
);

const BACK = 'M19 12H5M12 19l-7-7 7-7';

const LegalLayout = ({ title, updated, children }) => (
    <div className="min-h-screen" style={{ backgroundColor: 'var(--bg-primary)', color: 'var(--text-primary)' }}>
        <nav
            className="sticky top-0 z-50 border-b"
            style={{ backgroundColor: 'var(--glass)', backdropFilter: 'blur(16px) saturate(150%)', borderColor: 'var(--border-color)' }}
        >
            <div className="max-w-[860px] mx-auto px-6 h-14 flex items-center justify-between">
                <Link to="/" className="flex items-center gap-2">
                    <img src="/logo-mark.png" alt="" className="w-6 h-6 object-contain flex-none" />
                    <span className="text-[14.5px] font-semibold tracking-[-0.02em]">AgentX</span>
                </Link>
                <Link to="/" className="flex items-center gap-1.5 text-[13px] font-medium transition-colors hover:text-[var(--text-primary)]" style={{ color: 'var(--text-secondary)' }}>
                    <Icon d={BACK} className="w-3.5 h-3.5" />
                    Back to home
                </Link>
            </div>
        </nav>

        <main className="max-w-[720px] mx-auto px-6 py-14">
            <h1 className="text-[28px] font-semibold tracking-[-0.02em] mb-1.5">{title}</h1>
            <p className="text-[13px] mb-10" style={{ color: 'var(--text-tertiary)' }}>Last updated {updated}</p>
            <div className="legal-prose space-y-7 text-[14.5px] leading-[1.7]" style={{ color: 'var(--text-secondary)' }}>
                {children}
            </div>
        </main>

        <style>{`
            .legal-prose h2 {
                font-size: 17px;
                font-weight: 600;
                letter-spacing: -0.01em;
                color: var(--text-primary);
                margin-bottom: 0.6em;
            }
            .legal-prose ul {
                list-style: disc;
                padding-left: 1.3em;
                display: flex;
                flex-direction: column;
                gap: 0.35em;
            }
            .legal-prose a { color: var(--accent); text-decoration: underline; text-underline-offset: 2px; }
        `}</style>
    </div>
);

const UPDATED = 'August 9, 2026';
const CONTACT_EMAIL = 'support@example.com';

export const PrivacyPolicyPage = () => (
    <LegalLayout title="Privacy Policy" updated={UPDATED}>
        <p>
            Sandboxed Agent Engine ("we", "us") provides an agentic AI workspace at app.example.com — a chat
            interface with a code sandbox, document retrieval, and optional third-party tool
            connections (including Google Drive). This policy explains what we collect, why, and
            how you can control it.
        </p>

        <section>
            <h2>1. What we collect</h2>
            <ul>
                <li><strong>Account data</strong> — name, email address, and a hashed password (or your Google account identifier, if you sign in with Google).</li>
                <li><strong>Conversation data</strong> — the messages you send, the agent's responses, and files you upload for retrieval (RAG), stored so your chat history and knowledge base persist across sessions.</li>
                <li><strong>Sandbox output</strong> — files your requests cause the agent to generate (documents, spreadsheets, charts), stored in a workspace scoped to your account.</li>
                <li><strong>Usage data</strong> — token counts and computed cost per turn, used to track your free-tier usage against a spending cap.</li>
                <li><strong>Memory</strong> — durable facts the agent extracts from your conversations (e.g. your stack, your projects) to personalize future replies. You can view and clear this at any time in Settings.</li>
                <li><strong>Google account data (only if you connect Google Drive)</strong> — an OAuth token and the minimum Drive metadata/file contents needed to fulfill your own requests (e.g. "summarize this file from my Drive"). See Section 4.</li>
            </ul>
        </section>

        <section>
            <h2>2. How we use it</h2>
            <p>
                Solely to operate the service: authenticating you, running your conversations
                through the underlying language model, retrieving your uploaded documents,
                executing sandboxed code you asked the agent to run, and enforcing free-tier usage
                limits. We do not sell your data, and we do not use your content to train models
                beyond what's needed to serve your own requests.
            </p>
        </section>

        <section>
            <h2>3. Sub-processors</h2>
            <p>To provide the service, your data may pass through the following infrastructure providers, strictly to perform the function each one is used for:</p>
            <ul>
                <li>A large-language-model API (for generating responses)</li>
                <li>MongoDB Atlas (account and conversation storage)</li>
                <li>Qdrant (vector search over your uploaded documents)</li>
                <li>Cloudinary (storage for generated images/figures)</li>
                <li>Tavily (web search results, only when the agent uses its web-search tool)</li>
                <li>LlamaParse (document parsing for uploaded PDFs)</li>
            </ul>
        </section>

        <section>
            <h2>4. Google user data (Limited Use)</h2>
            <p>
                If you connect Google Drive, AgentX requests access strictly to read and act on
                files you explicitly ask the agent to work with. AgentX's use and transfer of
                information received from Google APIs adheres to the{' '}
                <a href="https://developers.google.com/terms/api-services-user-data-policy" target="_blank" rel="noopener noreferrer">
                    Google API Services User Data Policy
                </a>, including the Limited Use requirements. We do not use Google user data for
                advertising, and we do not allow humans to read it except as needed for security,
                legal compliance, or with your consent. You can revoke access at any time from
                Settings → MCP Servers, or directly from your{' '}
                <a href="https://myaccount.google.com/permissions" target="_blank" rel="noopener noreferrer">Google Account permissions</a>.
            </p>
        </section>

        <section>
            <h2>5. Your controls</h2>
            <ul>
                <li>Clear your extracted memory bank at any time (Settings).</li>
                <li>Disconnect Google Drive or any other connected tool at any time (Settings → MCP Servers).</li>
                <li>Request deletion of your account and associated data by emailing us (below).</li>
            </ul>
        </section>

        <section>
            <h2>6. Cookies</h2>
            <p>
                We use a single essential session cookie to keep you signed in. We don't use
                third-party advertising or tracking cookies.
            </p>
        </section>

        <section>
            <h2>7. Children</h2>
            <p>AgentX is not directed at children under 13, and we do not knowingly collect data from them.</p>
        </section>

        <section>
            <h2>8. Changes</h2>
            <p>We'll update the date at the top of this page when this policy changes. Material changes will be noted here.</p>
        </section>

        <section>
            <h2>9. Contact</h2>
            <p>Questions about this policy or your data: <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a></p>
        </section>
    </LegalLayout>
);

export const TermsOfServicePage = () => (
    <LegalLayout title="Terms of Service" updated={UPDATED}>
        <p>
            These terms govern your use of Sandboxed Agent Engine (app.example.com). By creating an account
            or using the service, you agree to them.
        </p>

        <section>
            <h2>1. The service</h2>
            <p>
                AgentX is an AI agent workspace: a chat interface backed by a language model with
                access to a code sandbox, document retrieval, and optional third-party tool
                connections. It is provided on an "as is" basis and may change or be interrupted
                without notice, especially during active development.
            </p>
        </section>

        <section>
            <h2>2. Accounts</h2>
            <p>
                You're responsible for your account credentials and for anything that happens
                under your account. Don't share your login, and let us know if you suspect
                unauthorized access.
            </p>
        </section>

        <section>
            <h2>3. Free-tier usage</h2>
            <p>
                New accounts include a limited free-tier credit allowance for model usage. We
                track usage per account and may pause a turn once the cap is reached. We may
                change allowance amounts going forward; we'll reflect the current cap in the
                product itself rather than only here.
            </p>
        </section>

        <section>
            <h2>4. Acceptable use</h2>
            <p>You agree not to use AgentX to:</p>
            <ul>
                <li>Generate or facilitate illegal content, malware, or attacks against systems you don't own or have permission to test</li>
                <li>Attempt to break out of the sandbox environment or access another user's data</li>
                <li>Abuse the service in a way that degrades it for other users (e.g. automated high-volume abuse)</li>
                <li>Violate the terms of any connected third-party service (e.g. Google's terms, when Drive is connected)</li>
            </ul>
            <p>We may suspend or terminate accounts that violate these terms.</p>
        </section>

        <section>
            <h2>5. Your content</h2>
            <p>
                You retain ownership of what you upload and what the agent generates for you. You
                grant us the limited right to process it strictly to operate the service (see the{' '}
                <Link to="/privacy">Privacy Policy</Link>).
            </p>
        </section>

        <section>
            <h2>6. AI output disclaimer</h2>
            <p>
                Responses, code, and files generated by the agent may contain errors. Review
                anything before relying on it, especially generated code, calculations, or factual
                claims. We're not liable for decisions made solely on the basis of AI output.
            </p>
        </section>

        <section>
            <h2>7. Limitation of liability</h2>
            <p>
                AgentX is provided without warranties of any kind. To the fullest extent permitted
                by law, we are not liable for indirect, incidental, or consequential damages
                arising from your use of the service.
            </p>
        </section>

        <section>
            <h2>8. Changes to these terms</h2>
            <p>We may update these terms as the product evolves. Continued use after a change means you accept the update.</p>
        </section>

        <section>
            <h2>9. Contact</h2>
            <p>Questions about these terms: <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a></p>
        </section>
    </LegalLayout>
);
