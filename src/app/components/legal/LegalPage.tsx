import { useParams, useSearchParams, Link } from 'react-router';
import AppHeader from '../AppHeader';
import Footer from '../Footer';
import LegalSidebarTOC from './LegalSidebarTOC';
import LegalDocumentRenderer from './LegalDocumentRenderer';
import { getLatestDocument, getDocumentVersion, listVersions } from '../../../lib/legal/registry';
import { useDocumentMeta } from '../../../lib/hooks/useDocumentMeta';

export default function LegalPage() {
  const { slug = '' } = useParams<{ slug: string }>();
  const [searchParams] = useSearchParams();
  const requestedVersion = searchParams.get('version');

  const doc = requestedVersion ? getDocumentVersion(slug, requestedVersion) : getLatestDocument(slug);
  const versions = listVersions(slug);

  useDocumentMeta(
    doc ? `${doc.title} — Gazua` : 'Not Found — Gazua',
    doc ? `${doc.title}. Effective ${doc.effectiveDate}. Read Gazua's ${doc.title.toLowerCase()}.` : undefined,
  );

  if (!doc) {
    return (
      <div className="min-h-screen flex flex-col bg-white dark:bg-black">
        <AppHeader />
        <div className="flex-1 flex items-center justify-center px-6 py-24 text-center">
          <div>
            <h1 className="text-2xl font-bold mb-2 dark:text-white">Document not found</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
              We couldn't find the legal document you're looking for.
            </p>
            <Link to="/legal/terms" className="text-[#00a86b] hover:underline text-sm">
              View Terms of Service
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-white dark:bg-black print:min-h-0">
      <div className="print:hidden">
        <AppHeader />
      </div>

      <div className="flex-1 overflow-y-auto print:overflow-visible">
        <div className="max-w-5xl mx-auto px-6 py-12 pb-24 lg:pb-12 lg:grid lg:grid-cols-[200px_1fr] lg:gap-12 print:block print:max-w-none">
          <div className="print:hidden">
            <LegalSidebarTOC headings={doc.headings} className="hidden lg:block" />
          </div>

          <div className="max-w-3xl">
            <h1 className="text-3xl font-bold mb-2 dark:text-white">{doc.title}</h1>
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-gray-500 dark:text-gray-400 mb-10">
              <span>Effective {doc.effectiveDate}</span>
              <span aria-hidden="true">·</span>
              <span>Version {doc.version}</span>
              {versions.length > 1 && (
                <>
                  <span aria-hidden="true">·</span>
                  <label className="print:hidden">
                    <span className="sr-only">Select version</span>
                    <select
                      value={doc.version}
                      onChange={(e) => {
                        const params = new URLSearchParams(searchParams);
                        params.set('version', e.target.value);
                        window.location.search = params.toString();
                      }}
                      className="text-sm text-gray-500 dark:text-gray-400 bg-transparent border-none underline hover:text-black dark:hover:text-white cursor-pointer"
                    >
                      {versions.map((v) => (
                        <option key={v.version} value={v.version}>
                          {v.version === versions[0].version ? `${v.version} (latest)` : v.version}
                        </option>
                      ))}
                    </select>
                  </label>
                </>
              )}
            </div>

            <LegalDocumentRenderer markdown={doc.content} />

            <div className="print:hidden">
              <Footer variant="full" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
