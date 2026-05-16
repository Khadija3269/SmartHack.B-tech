import { Link, useSearchParams } from "react-router-dom";
import clipboard from "@/assets/clipboard-check.png";

function EvaluationSubmittedPage() {
  const [params] = useSearchParams();
  const submissionId = params.get("submissionId");

  return (
    <div className="min-h-screen bg-white p-8">
      <div className="max-w-3xl mx-auto flex justify-end mb-4">
        <Link to="/judge-dashboard" className="text-2xl text-gray-700">
          ←
        </Link>
      </div>

      <div className="max-w-3xl mx-auto bg-[#5B8FCF] rounded-2xl py-12 px-6 text-center shadow-md">
        <h1 className="text-white text-4xl md:text-5xl font-bold mb-6">
          Evaluation Submitted
        </h1>

        <img
          src={clipboard}
          alt="Clipboard with checks"
          loading="lazy"
          width={280}
          height={280}
          className="mx-auto w-64 h-auto"
        />

        <div className="flex flex-col gap-3 items-center mt-6">
          {/* Back to dashboard */}
          <Link
            to="/judge-dashboard"
            className="bg-white text-[#1f3a68] font-bold rounded-full px-8 py-2.5 hover:opacity-90"
          >
            Back to Dashboard
          </Link>

          {/* Optional: go back to same project */}
          {submissionId && (
            <Link
              to={`/evaluation?submissionId=${submissionId}`}
              className="text-white underline text-sm"
            >
              View this evaluation again
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}

export default EvaluationSubmittedPage;