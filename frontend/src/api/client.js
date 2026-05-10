import axios from "axios";

const api = axios.create({
  baseURL: "/api",
  timeout: 15000,
});

export const Jobs = {
  list: (params) => api.get("/jobs", { params }).then((r) => r.data),
  get: (id) => api.get(`/jobs/${id}`).then((r) => r.data),
  create: (body) => api.post("/jobs", body).then((r) => r.data),
  cancel: (id) => api.post(`/jobs/${id}/cancel`).then((r) => r.data),
  rerun: (id) => api.post(`/jobs/${id}/rerun`).then((r) => r.data),
  getLog: (id, since = 0) =>
    api.get(`/jobs/${id}/logs`, { params: { since } }).then((r) => r.data),
};

export const Workers = {
  list: () => api.get("/workers").then((r) => r.data),
};

export const Schedules = {
  list: () => api.get("/schedules").then((r) => r.data),
  create: (body) => api.post("/schedules", body).then((r) => r.data),
  update: (id, body) => api.patch(`/schedules/${id}`, body).then((r) => r.data),
  remove: (id) => api.delete(`/schedules/${id}`).then((r) => r.data),
  preview: (cron_expr) =>
    api.post("/schedules/preview", { cron_expr }).then((r) => r.data),
};

export const Analytics = {
  summary: () => api.get("/analytics/summary").then((r) => r.data),
  trends: (days = 14) =>
    api.get("/analytics/trends", { params: { days } }).then((r) => r.data),
  flaky: () => api.get("/analytics/flaky").then((r) => r.data),
  workers: (days = 7) =>
    api.get("/analytics/workers", { params: { days } }).then((r) => r.data),
  durations: (days = 14) =>
    api.get("/analytics/durations", { params: { days } }).then((r) => r.data),
};
