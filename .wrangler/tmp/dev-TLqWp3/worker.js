var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });

// .wrangler/tmp/bundle-Gr4W9s/checked-fetch.js
var urls = /* @__PURE__ */ new Set();
function checkURL(request, init) {
  const url = request instanceof URL ? request : new URL(
    (typeof request === "string" ? new Request(request, init) : request).url
  );
  if (url.port && url.port !== "443" && url.protocol === "https:") {
    if (!urls.has(url.toString())) {
      urls.add(url.toString());
      console.warn(
        `WARNING: known issue with \`fetch()\` requests to custom HTTPS ports in published Workers:
 - ${url.toString()} - the custom port will be ignored when the Worker is published using the \`wrangler deploy\` command.
`
      );
    }
  }
}
__name(checkURL, "checkURL");
globalThis.fetch = new Proxy(globalThis.fetch, {
  apply(target, thisArg, argArray) {
    const [request, init] = argArray;
    checkURL(request, init);
    return Reflect.apply(target, thisArg, argArray);
  }
});

// worker.js
var worker_default = {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const { pathname } = url;
    const method = request.method.toUpperCase();
    const DB = env.DB;
    const corsHeaders = {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, PUT, PATCH, DELETE, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type"
    };
    if (method === "OPTIONS") {
      return new Response(null, {
        status: 204,
        headers: corsHeaders
      });
    }
    async function parseBody(req) {
      try {
        return await req.json();
      } catch {
        return null;
      }
    }
    __name(parseBody, "parseBody");
    function validateSurvey(survey) {
      if (!survey.title || typeof survey.title !== "string" || survey.title.trim() === "") {
        return { valid: false, message: "Survey title is required and must be a non-empty string" };
      }
      if (!survey.questions || !Array.isArray(survey.questions)) {
        return { valid: false, message: "Questions must be an array" };
      }
      if (survey.questions.length === 0) {
        return { valid: false, message: "Survey must have at least one question" };
      }
      for (let i = 0; i < survey.questions.length; i++) {
        const question = survey.questions[i];
        if (!question.questionText || typeof question.questionText !== "string" || question.questionText.trim() === "") {
          return { valid: false, message: `Question ${i + 1} must have a non-empty questionText` };
        }
        if (!question.type || !["multiple-choice", "single-select", "free-text"].includes(question.type)) {
          return { valid: false, message: `Question ${i + 1} must have a valid type (multiple-choice, single-select, or free-text)` };
        }
        if (question.type !== "free-text") {
          if (!question.options || !Array.isArray(question.options)) {
            return { valid: false, message: `Question ${i + 1} must have an options array for choice-based questions` };
          }
          if (question.options.length < 2) {
            return { valid: false, message: `Question ${i + 1} must have at least 2 options for choice-based questions` };
          }
          for (let j = 0; j < question.options.length; j++) {
            if (!question.options[j] || typeof question.options[j] !== "string" || question.options[j].trim() === "") {
              return { valid: false, message: `Question ${i + 1}, Option ${j + 1} must have non-empty text` };
            }
          }
        }
        if (typeof question.required !== "boolean") {
          return { valid: false, message: `Question ${i + 1} must have a boolean required field` };
        }
      }
      return { valid: true };
    }
    __name(validateSurvey, "validateSurvey");
    function json(data, status = 200) {
      return new Response(JSON.stringify(data), {
        status,
        headers: {
          "Content-Type": "application/json",
          ...corsHeaders
        }
      });
    }
    __name(json, "json");
    if (method === "GET" && pathname === "/api/health") {
      return json({
        success: true,
        message: "Server is running",
        timestamp: (/* @__PURE__ */ new Date()).toISOString()
      });
    }
    if (method === "GET" && pathname === "/test-db") {
      try {
        const { results } = await DB.prepare("SELECT name FROM sqlite_master WHERE type='table'").all();
        const tableNames = results.map((row) => row.name);
        let responseCount = 0;
        let surveyCount = 0;
        if (tableNames.includes("survey_responses")) {
          const responseResult = await DB.prepare("SELECT COUNT(*) as count FROM survey_responses").all();
          responseCount = responseResult.results[0].count;
        }
        if (tableNames.includes("surveys")) {
          const surveyResult = await DB.prepare("SELECT COUNT(*) as count FROM surveys").all();
          surveyCount = surveyResult.results[0].count;
        }
        return json({
          success: true,
          message: "Database tables retrieved successfully",
          data: {
            tables: tableNames,
            count: tableNames.length,
            survey_responses_count: responseCount,
            surveys_count: surveyCount
          }
        });
      } catch (error) {
        return json({
          success: false,
          message: "Internal server error while retrieving database tables",
          error: error.message
        }, 500);
      }
    }
    if (method === "POST" && pathname === "/test-add-responses") {
      try {
        const { results: surveys } = await DB.prepare("SELECT id, title FROM surveys LIMIT 1").all();
        if (!surveys.length) {
          return json({ success: false, message: "No surveys found to add responses to" }, 404);
        }
        const surveyId = surveys[0].id;
        const surveyTitle = surveys[0].title;
        const sampleResponses = [
          {
            respondentName: "John Doe",
            responses: [
              { questionId: 0, answer: "Sample answer 1" },
              { questionId: 1, answer: "Sample answer 2" }
            ]
          },
          {
            respondentName: "Jane Smith",
            responses: [
              { questionId: 0, answer: "Another answer 1" },
              { questionId: 1, answer: "Another answer 2" }
            ]
          },
          {
            respondentName: "Bob Johnson",
            responses: [
              { questionId: 0, answer: "Third answer 1" },
              { questionId: 1, answer: "Third answer 2" }
            ]
          }
        ];
        for (const response of sampleResponses) {
          const responseId = Date.now().toString() + Math.random().toString(36).substr(2, 9);
          const now = (/* @__PURE__ */ new Date()).toISOString();
          await DB.prepare(
            "INSERT INTO survey_responses (id, surveyId, respondentName, responses, submittedAt) VALUES (?, ?, ?, ?, ?)"
          ).bind(
            responseId,
            surveyId,
            response.respondentName,
            JSON.stringify(response.responses),
            now
          ).run();
        }
        return json({
          success: true,
          message: "Sample responses added successfully",
          data: {
            surveyId,
            surveyTitle,
            responsesAdded: sampleResponses.length
          }
        });
      } catch (error) {
        console.error("Error adding sample responses:", error);
        return json({
          success: false,
          message: "Internal server error while adding sample responses",
          error: error.message
        }, 500);
      }
    }
    if (method === "GET" && pathname === "/api/surveys") {
      try {
        console.log("Fetching surveys with response counts...");
        const { results } = await DB.prepare(`
          SELECT 
            s.id, 
            s.title, 
            s.questions, 
            s.createdAt, 
            s.updatedAt, 
            s.submitted,
            COALESCE(r.responseCount, 0) as responseCount
          FROM surveys s
          LEFT JOIN (
            SELECT surveyId, COUNT(*) as responseCount
            FROM survey_responses
            GROUP BY surveyId
          ) r ON s.id = r.surveyId
        `).all();
        console.log("Survey results:", results.map((s) => ({
          id: s.id,
          title: s.title,
          responseCount: s.responseCount
        })));
        return json({
          success: true,
          message: "Surveys retrieved successfully",
          data: {
            surveys: results.map((s) => ({
              id: s.id,
              title: s.title,
              questionCount: JSON.parse(s.questions).length,
              responseCount: s.responseCount,
              createdAt: s.createdAt,
              updatedAt: s.updatedAt || s.createdAt,
              submitted: !!s.submitted
            })),
            total: results.length
          }
        });
      } catch (error) {
        console.error("Error fetching surveys:", error);
        return json({ success: false, message: "Internal server error while retrieving surveys" }, 500);
      }
    }
    const surveyIdMatch = pathname.match(/^\/api\/surveys\/([^\/]+)$/);
    if (method === "GET" && surveyIdMatch) {
      const surveyId = surveyIdMatch[1];
      try {
        const { results } = await DB.prepare("SELECT * FROM surveys WHERE id = ?").bind(surveyId).all();
        if (!results.length) {
          return json({ success: false, message: "Survey not found" }, 404);
        }
        const survey = results[0];
        survey.questions = JSON.parse(survey.questions);
        survey.submitted = !!survey.submitted;
        return json({
          success: true,
          message: "Survey retrieved successfully",
          data: survey
        });
      } catch (error) {
        return json({ success: false, message: "Internal server error while retrieving survey" }, 500);
      }
    }
    if (method === "POST" && pathname === "/api/surveys") {
      try {
        const surveyData = await parseBody(request);
        const validation = validateSurvey(surveyData);
        if (!validation.valid) {
          return json({ success: false, message: validation.message }, 400);
        }
        const id = Date.now().toString();
        const now = (/* @__PURE__ */ new Date()).toISOString();
        const questions = surveyData.questions.map((q) => ({
          questionText: q.questionText.trim(),
          type: q.type,
          options: q.type === "free-text" ? [] : q.options.map((opt) => opt.trim()),
          required: q.required
        }));
        await DB.prepare(
          "INSERT INTO surveys (id, title, questions, createdAt, submitted) VALUES (?, ?, ?, ?, 0)"
        ).bind(id, surveyData.title.trim(), JSON.stringify(questions), now).run();
        return json({
          success: true,
          message: "Survey created successfully",
          data: {
            id,
            title: surveyData.title.trim(),
            questionCount: questions.length
          }
        }, 201);
      } catch (error) {
        return json({ success: false, message: "Internal server error while creating survey" }, 500);
      }
    }
    const submitMatch = pathname.match(/^\/api\/surveys\/([^\/]+)\/submit$/);
    if (method === "POST" && submitMatch) {
      const surveyId = submitMatch[1];
      try {
        const { results } = await DB.prepare("SELECT * FROM surveys WHERE id = ?").bind(surveyId).all();
        if (!results.length) {
          return json({ success: false, message: "Survey not found" }, 404);
        }
        await DB.prepare("UPDATE surveys SET submitted = 1, submittedAt = ? WHERE id = ?").bind((/* @__PURE__ */ new Date()).toISOString(), surveyId).run();
        return json({
          success: true,
          message: "Survey marked as submitted successfully",
          data: { id: surveyId, submitted: true }
        });
      } catch (error) {
        return json({ success: false, message: "Internal server error while submitting survey" }, 500);
      }
    }
    if (method === "PUT" && surveyIdMatch) {
      const surveyId = surveyIdMatch[1];
      try {
        const surveyData = await parseBody(request);
        const { results } = await DB.prepare("SELECT * FROM surveys WHERE id = ?").bind(surveyId).all();
        if (!results.length) {
          return json({ success: false, message: "Survey not found" }, 404);
        }
        const validation = validateSurvey(surveyData);
        if (!validation.valid) {
          return json({ success: false, message: validation.message }, 400);
        }
        const questions = surveyData.questions.map((q) => ({
          questionText: q.questionText.trim(),
          type: q.type,
          options: q.type === "free-text" ? [] : q.options.map((opt) => opt.trim()),
          required: q.required
        }));
        await DB.prepare(
          "UPDATE surveys SET title = ?, questions = ?, updatedAt = ?, submitted = submitted WHERE id = ?"
        ).bind(
          surveyData.title.trim(),
          JSON.stringify(questions),
          (/* @__PURE__ */ new Date()).toISOString(),
          surveyId
        ).run();
        return json({
          success: true,
          message: "Survey updated successfully",
          data: {
            id: surveyId,
            title: surveyData.title.trim(),
            questionCount: questions.length
          }
        });
      } catch (error) {
        return json({ success: false, message: "Internal server error while updating survey" }, 500);
      }
    }
    const statusMatch = pathname.match(/^\/api\/surveys\/([^\/]+)\/status$/);
    if (method === "PATCH" && statusMatch) {
      const surveyId = statusMatch[1];
      try {
        const statusData = await parseBody(request);
        if (!statusData) {
          return json({ success: false, message: "Request body is required" }, 400);
        }
        if (typeof statusData.published !== "boolean") {
          return json({ success: false, message: "published field must be a boolean value" }, 400);
        }
        const { results } = await DB.prepare("SELECT * FROM surveys WHERE id = ?").bind(surveyId).all();
        if (!results.length) {
          return json({ success: false, message: "Survey not found" }, 404);
        }
        await DB.prepare(
          "UPDATE surveys SET submitted = ?, updatedAt = ? WHERE id = ?"
        ).bind(
          statusData.published ? 1 : 0,
          (/* @__PURE__ */ new Date()).toISOString(),
          surveyId
        ).run();
        return json({
          success: true,
          message: `Survey ${statusData.published ? "published" : "unpublished"} successfully`,
          data: {
            id: surveyId,
            published: statusData.published
          }
        });
      } catch (error) {
        console.error("Error updating survey status:", error);
        return json({ success: false, message: "Internal server error while updating survey status" }, 500);
      }
    }
    if (method === "DELETE" && surveyIdMatch) {
      const surveyId = surveyIdMatch[1];
      try {
        const { results } = await DB.prepare("SELECT * FROM surveys WHERE id = ?").bind(surveyId).all();
        if (!results.length) {
          return json({ success: false, message: "Survey not found" }, 404);
        }
        await DB.prepare("DELETE FROM surveys WHERE id = ?").bind(surveyId).run();
        return json({
          success: true,
          message: "Survey deleted successfully",
          data: {
            id: surveyId,
            title: results[0].title
          }
        });
      } catch (error) {
        return json({ success: false, message: "Internal server error while deleting survey" }, 500);
      }
    }
    if (method === "POST" && pathname === "/api/surveys/responses") {
      try {
        console.log("Received survey response submission request");
        const responseData = await parseBody(request);
        console.log("Parsed request body:", responseData);
        if (!responseData) {
          console.error("No request body provided");
          return json({ success: false, message: "Request body is required" }, 400);
        }
        if (!responseData.surveyId) {
          console.error("Missing surveyId");
          return json({ success: false, message: "surveyId is required" }, 400);
        }
        if (!responseData.respondentName || responseData.respondentName.trim() === "") {
          console.error("Missing or empty respondentName");
          return json({ success: false, message: "respondentName is required" }, 400);
        }
        if (!responseData.responses || !Array.isArray(responseData.responses)) {
          console.error("Missing or invalid responses array");
          return json({ success: false, message: "responses array is required" }, 400);
        }
        console.log("Checking if survey exists:", responseData.surveyId);
        const { results: surveyResults } = await DB.prepare("SELECT * FROM surveys WHERE id = ?").bind(responseData.surveyId).all();
        if (!surveyResults.length) {
          console.error("Survey not found:", responseData.surveyId);
          return json({ success: false, message: "Survey not found" }, 404);
        }
        console.log("Survey found, creating response record");
        const responseId = Date.now().toString();
        const now = (/* @__PURE__ */ new Date()).toISOString();
        const insertResult = await DB.prepare(
          "INSERT INTO survey_responses (id, surveyId, respondentName, responses, submittedAt) VALUES (?, ?, ?, ?, ?)"
        ).bind(
          responseId,
          responseData.surveyId,
          responseData.respondentName.trim(),
          JSON.stringify(responseData.responses),
          now
        ).run();
        console.log("Response inserted successfully:", insertResult);
        return json({
          success: true,
          message: "Survey response submitted successfully",
          data: {
            id: responseId,
            surveyId: responseData.surveyId,
            respondentName: responseData.respondentName,
            submittedAt: now
          }
        }, 201);
      } catch (error) {
        console.error("Error submitting survey response:", error);
        return json({
          success: false,
          message: "Internal server error while submitting response",
          error: error.message
        }, 500);
      }
    }
    const responsesMatch = pathname.match(/^\/api\/surveys\/([^\/]+)\/responses$/);
    if (method === "GET" && responsesMatch) {
      const surveyId = responsesMatch[1];
      try {
        const { results: surveyResults } = await DB.prepare("SELECT * FROM surveys WHERE id = ?").bind(surveyId).all();
        if (!surveyResults.length) {
          return json({ success: false, message: "Survey not found" }, 404);
        }
        const { results } = await DB.prepare("SELECT * FROM survey_responses WHERE surveyId = ? ORDER BY submittedAt DESC").bind(surveyId).all();
        const responses = results.map((r) => ({
          id: r.id,
          surveyId: r.surveyId,
          respondentName: r.respondentName,
          responses: JSON.parse(r.responses),
          submittedAt: r.submittedAt
        }));
        return json({
          success: true,
          message: "Survey responses retrieved successfully",
          data: {
            surveyId,
            responses,
            total: responses.length
          }
        });
      } catch (error) {
        return json({ success: false, message: "Internal server error while retrieving responses" }, 500);
      }
    }
    return json({ success: false, message: "Not found" }, 404);
  }
};

// node_modules/wrangler/templates/middleware/middleware-ensure-req-body-drained.ts
var drainBody = /* @__PURE__ */ __name(async (request, env, _ctx, middlewareCtx) => {
  try {
    return await middlewareCtx.next(request, env);
  } finally {
    try {
      if (request.body !== null && !request.bodyUsed) {
        const reader = request.body.getReader();
        while (!(await reader.read()).done) {
        }
      }
    } catch (e) {
      console.error("Failed to drain the unused request body.", e);
    }
  }
}, "drainBody");
var middleware_ensure_req_body_drained_default = drainBody;

// node_modules/wrangler/templates/middleware/middleware-miniflare3-json-error.ts
function reduceError(e) {
  return {
    name: e?.name,
    message: e?.message ?? String(e),
    stack: e?.stack,
    cause: e?.cause === void 0 ? void 0 : reduceError(e.cause)
  };
}
__name(reduceError, "reduceError");
var jsonError = /* @__PURE__ */ __name(async (request, env, _ctx, middlewareCtx) => {
  try {
    return await middlewareCtx.next(request, env);
  } catch (e) {
    const error = reduceError(e);
    return Response.json(error, {
      status: 500,
      headers: { "MF-Experimental-Error-Stack": "true" }
    });
  }
}, "jsonError");
var middleware_miniflare3_json_error_default = jsonError;

// .wrangler/tmp/bundle-Gr4W9s/middleware-insertion-facade.js
var __INTERNAL_WRANGLER_MIDDLEWARE__ = [
  middleware_ensure_req_body_drained_default,
  middleware_miniflare3_json_error_default
];
var middleware_insertion_facade_default = worker_default;

// node_modules/wrangler/templates/middleware/common.ts
var __facade_middleware__ = [];
function __facade_register__(...args) {
  __facade_middleware__.push(...args.flat());
}
__name(__facade_register__, "__facade_register__");
function __facade_invokeChain__(request, env, ctx, dispatch, middlewareChain) {
  const [head, ...tail] = middlewareChain;
  const middlewareCtx = {
    dispatch,
    next(newRequest, newEnv) {
      return __facade_invokeChain__(newRequest, newEnv, ctx, dispatch, tail);
    }
  };
  return head(request, env, ctx, middlewareCtx);
}
__name(__facade_invokeChain__, "__facade_invokeChain__");
function __facade_invoke__(request, env, ctx, dispatch, finalMiddleware) {
  return __facade_invokeChain__(request, env, ctx, dispatch, [
    ...__facade_middleware__,
    finalMiddleware
  ]);
}
__name(__facade_invoke__, "__facade_invoke__");

// .wrangler/tmp/bundle-Gr4W9s/middleware-loader.entry.ts
var __Facade_ScheduledController__ = class ___Facade_ScheduledController__ {
  constructor(scheduledTime, cron, noRetry) {
    this.scheduledTime = scheduledTime;
    this.cron = cron;
    this.#noRetry = noRetry;
  }
  static {
    __name(this, "__Facade_ScheduledController__");
  }
  #noRetry;
  noRetry() {
    if (!(this instanceof ___Facade_ScheduledController__)) {
      throw new TypeError("Illegal invocation");
    }
    this.#noRetry();
  }
};
function wrapExportedHandler(worker) {
  if (__INTERNAL_WRANGLER_MIDDLEWARE__ === void 0 || __INTERNAL_WRANGLER_MIDDLEWARE__.length === 0) {
    return worker;
  }
  for (const middleware of __INTERNAL_WRANGLER_MIDDLEWARE__) {
    __facade_register__(middleware);
  }
  const fetchDispatcher = /* @__PURE__ */ __name(function(request, env, ctx) {
    if (worker.fetch === void 0) {
      throw new Error("Handler does not export a fetch() function.");
    }
    return worker.fetch(request, env, ctx);
  }, "fetchDispatcher");
  return {
    ...worker,
    fetch(request, env, ctx) {
      const dispatcher = /* @__PURE__ */ __name(function(type, init) {
        if (type === "scheduled" && worker.scheduled !== void 0) {
          const controller = new __Facade_ScheduledController__(
            Date.now(),
            init.cron ?? "",
            () => {
            }
          );
          return worker.scheduled(controller, env, ctx);
        }
      }, "dispatcher");
      return __facade_invoke__(request, env, ctx, dispatcher, fetchDispatcher);
    }
  };
}
__name(wrapExportedHandler, "wrapExportedHandler");
function wrapWorkerEntrypoint(klass) {
  if (__INTERNAL_WRANGLER_MIDDLEWARE__ === void 0 || __INTERNAL_WRANGLER_MIDDLEWARE__.length === 0) {
    return klass;
  }
  for (const middleware of __INTERNAL_WRANGLER_MIDDLEWARE__) {
    __facade_register__(middleware);
  }
  return class extends klass {
    #fetchDispatcher = /* @__PURE__ */ __name((request, env, ctx) => {
      this.env = env;
      this.ctx = ctx;
      if (super.fetch === void 0) {
        throw new Error("Entrypoint class does not define a fetch() function.");
      }
      return super.fetch(request);
    }, "#fetchDispatcher");
    #dispatcher = /* @__PURE__ */ __name((type, init) => {
      if (type === "scheduled" && super.scheduled !== void 0) {
        const controller = new __Facade_ScheduledController__(
          Date.now(),
          init.cron ?? "",
          () => {
          }
        );
        return super.scheduled(controller);
      }
    }, "#dispatcher");
    fetch(request) {
      return __facade_invoke__(
        request,
        this.env,
        this.ctx,
        this.#dispatcher,
        this.#fetchDispatcher
      );
    }
  };
}
__name(wrapWorkerEntrypoint, "wrapWorkerEntrypoint");
var WRAPPED_ENTRY;
if (typeof middleware_insertion_facade_default === "object") {
  WRAPPED_ENTRY = wrapExportedHandler(middleware_insertion_facade_default);
} else if (typeof middleware_insertion_facade_default === "function") {
  WRAPPED_ENTRY = wrapWorkerEntrypoint(middleware_insertion_facade_default);
}
var middleware_loader_entry_default = WRAPPED_ENTRY;
export {
  __INTERNAL_WRANGLER_MIDDLEWARE__,
  middleware_loader_entry_default as default
};
//# sourceMappingURL=worker.js.map
