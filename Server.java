import com.sun.net.httpserver.HttpExchange;
import com.sun.net.httpserver.HttpHandler;
import com.sun.net.httpserver.HttpServer;

import java.io.*;
import java.net.InetSocketAddress;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.*;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * ==============================================================================
 * College DBMS Project - Complete Single-File Java Backend
 * ==============================================================================
 * Runs a standalone REST API server on port 8080 with zero external dependencies.
 * Handles Teacher Authentication and Student CRUD operations directly against PostgreSQL / Supabase.
 *
 * Usage:
 *   java Server.java
 * ==============================================================================
 */
public class Server {

    private static int PORT = 8080;
    private static String SUPABASE_URL = "";
    private static String SUPABASE_KEY = "";
    private static String TEACHER_EMAIL_DOMAIN = "school.edu";

    private static final HttpClient HTTP_CLIENT = HttpClient.newHttpClient();

    public static void main(String[] args) throws IOException {
        loadEnvironment();

        if (SUPABASE_URL.isEmpty() || SUPABASE_KEY.isEmpty()) {
            System.err.println(">> [WARN] Supabase URL or Publishable Key not found in .env");
            System.err.println(">> Ensure .env exists with VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY");
        } else {
            System.out.println(">> [DB] Connected to Supabase Instance: " + SUPABASE_URL);
        }

        HttpServer server = HttpServer.create(new InetSocketAddress(PORT), 0);

        // Register REST API Endpoints
        server.createContext("/api/health", new HealthHandler());
        server.createContext("/api/auth/login", new AuthLoginHandler());
        server.createContext("/api/students", new StudentsHandler());

        server.setExecutor(null); // default executor
        System.out.println("=================================================================");
        System.out.println(" [JAVA BACKEND SERVER STARTED]");
        System.out.println(" Endpoint: http://localhost:" + PORT + "/api");
        System.out.println(" Health:   http://localhost:" + PORT + "/api/health");
        System.out.println(" Students: http://localhost:" + PORT + "/api/students");
        System.out.println("=================================================================");
        server.start();
    }

    // --------------------------------------------------------------------------
    // 1. Environment Loader (.env parser)
    // --------------------------------------------------------------------------
    private static void loadEnvironment() {
        Path envPath = Paths.get(".env");
        if (!Files.exists(envPath)) {
            envPath = Paths.get("../.env");
        }
        if (!Files.exists(envPath)) return;

        try {
            List<String> lines = Files.readAllLines(envPath);
            for (String line : lines) {
                line = line.trim();
                if (line.isEmpty() || line.startsWith("#")) continue;
                int idx = line.indexOf('=');
                if (idx > 0) {
                    String key = line.substring(0, idx).trim();
                    String val = line.substring(idx + 1).trim();
                    if (val.startsWith("\"") && val.endsWith("\"") && val.length() >= 2) {
                        val = val.substring(1, val.length() - 1);
                    }
                    if (key.equals("VITE_SUPABASE_URL") || key.equals("SUPABASE_URL")) {
                        SUPABASE_URL = val.replaceAll("/+$", "");
                    } else if (key.equals("VITE_SUPABASE_PUBLISHABLE_KEY") || key.equals("VITE_SUPABASE_ANON_KEY") || key.equals("SUPABASE_KEY")) {
                        SUPABASE_KEY = val;
                    } else if (key.equals("VITE_TEACHER_EMAIL_DOMAIN")) {
                        TEACHER_EMAIL_DOMAIN = val.replaceAll("^@", "");
                    } else if (key.equals("PORT") || key.equals("JAVA_PORT")) {
                        try { PORT = Integer.parseInt(val); } catch (Exception ignored) {}
                    }
                }
            }
        } catch (Exception e) {
            System.err.println(">> Error reading .env: " + e.getMessage());
        }
    }

    // --------------------------------------------------------------------------
    // 2. Health Endpoint
    // --------------------------------------------------------------------------
    static class HealthHandler implements HttpHandler {
        @Override
        public void handle(HttpExchange exchange) throws IOException {
            addCorsHeaders(exchange);
            if (exchange.getRequestMethod().equalsIgnoreCase("OPTIONS")) {
                exchange.sendResponseHeaders(204, -1);
                exchange.close();
                return;
            }
            String json = "{\"status\":\"UP\",\"engine\":\"Java 25 Standalone Server\",\"port\":" + PORT + "}";
            sendJsonResponse(exchange, 200, json);
        }
    }

    // --------------------------------------------------------------------------
    // 3. Teacher Authentication Endpoint (/api/auth/login)
    // --------------------------------------------------------------------------
    static class AuthLoginHandler implements HttpHandler {
        @Override
        public void handle(HttpExchange exchange) throws IOException {
            addCorsHeaders(exchange);
            if (exchange.getRequestMethod().equalsIgnoreCase("OPTIONS")) {
                exchange.sendResponseHeaders(204, -1);
                exchange.close();
                return;
            }
            if (!exchange.getRequestMethod().equalsIgnoreCase("POST")) {
                sendJsonResponse(exchange, 405, "{\"error\":\"Method Not Allowed\"}");
                return;
            }

            String body = readRequestBody(exchange);
            String teacherId = extractJsonValue(body, "teacherId");
            String password = extractJsonValue(body, "password");

            if (teacherId == null || teacherId.trim().isEmpty()) {
                sendJsonResponse(exchange, 400, "{\"error\":\"Teacher ID is required.\"}");
                return;
            }
            if (password == null || password.trim().isEmpty()) {
                sendJsonResponse(exchange, 400, "{\"error\":\"Password is required.\"}");
                return;
            }

            // Map Teacher ID to Email (e.g. T001 -> t001@school.edu)
            String cleanId = teacherId.trim().toLowerCase();
            String email = cleanId.contains("@") ? cleanId : cleanId + "@" + TEACHER_EMAIL_DOMAIN;

            System.out.println("[AUTH] Authenticating teacher: " + teacherId + " (" + email + ")");

            // Forward to Supabase Auth API
            try {
                String payload = "{\"email\":\"" + escapeJson(email) + "\",\"password\":\"" + escapeJson(password) + "\"}";
                HttpRequest request = HttpRequest.newBuilder()
                        .uri(URI.create(SUPABASE_URL + "/auth/v1/token?grant_type=password"))
                        .header("Content-Type", "application/json")
                        .header("apikey", SUPABASE_KEY)
                        .POST(HttpRequest.BodyPublishers.ofString(payload))
                        .build();

                HttpResponse<String> response = HTTP_CLIENT.send(request, HttpResponse.BodyHandlers.ofString());

                if (response.statusCode() == 200) {
                    System.out.println("[AUTH] Teacher login successful: " + teacherId);
                    sendJsonResponse(exchange, 200, response.body());
                } else {
                    System.out.println("[AUTH] Authentication failed for " + teacherId + " (Status: " + response.statusCode() + ")");
                    String errMessage = "Invalid Teacher ID or password. Please verify and try again.";
                    if (response.body().contains("Email not confirmed")) {
                        errMessage = "Account email not confirmed. Please verify the account in Supabase.";
                    }
                    sendJsonResponse(exchange, 401, "{\"error\":\"" + errMessage + "\"}");
                }
            } catch (Exception e) {
                System.err.println("[AUTH ERROR] " + e.getMessage());
                sendJsonResponse(exchange, 500, "{\"error\":\"Authentication service error: " + escapeJson(e.getMessage()) + "\"}");
            }
        }
    }

    // --------------------------------------------------------------------------
    // 4. Student CRUD Handler (/api/students)
    // --------------------------------------------------------------------------
    static class StudentsHandler implements HttpHandler {
        @Override
        public void handle(HttpExchange exchange) throws IOException {
            addCorsHeaders(exchange);
            String method = exchange.getRequestMethod().toUpperCase();
            if (method.equals("OPTIONS")) {
                exchange.sendResponseHeaders(204, -1);
                return;
            }

            String path = exchange.getRequestURI().getPath(); // e.g. /api/students or /api/students/12
            String query = exchange.getRequestURI().getQuery(); // e.g. search=101
            String token = extractBearerToken(exchange);

            if (token == null || token.isEmpty()) {
                sendJsonResponse(exchange, 401, "{\"error\":\"Authorization Bearer token required.\"}");
                return;
            }

            try {
                switch (method) {
                    case "GET":
                        handleGet(exchange, path, query, token);
                        break;
                    case "POST":
                        handlePost(exchange, token);
                        break;
                    case "PUT":
                        handlePut(exchange, path, token);
                        break;
                    case "DELETE":
                        handleDelete(exchange, path, token);
                        break;
                    default:
                        sendJsonResponse(exchange, 405, "{\"error\":\"Method Not Allowed\"}");
                }
            } catch (Exception e) {
                System.err.println("[STUDENTS API ERROR] " + e.getMessage());
                sendJsonResponse(exchange, 500, "{\"error\":\"Database operation failed: " + escapeJson(e.getMessage()) + "\"}");
            }
        }

        // READ / SEARCH Students
        private void handleGet(HttpExchange exchange, String path, String query, String token) throws Exception {
            String search = null;
            if (query != null && !query.isEmpty()) {
                for (String param : query.split("&")) {
                    String[] pair = param.split("=");
                    if (pair.length == 2 && pair[0].equals("search")) {
                        search = java.net.URLDecoder.decode(pair[1], StandardCharsets.UTF_8).trim();
                    }
                }
            }

            String targetUrl = SUPABASE_URL + "/rest/v1/students?select=*&order=register_no.asc";
            if (search != null && !search.isEmpty()) {
                targetUrl += "&register_no=ilike.*" + java.net.URLEncoder.encode(search, StandardCharsets.UTF_8) + "*";
            }

            HttpRequest request = HttpRequest.newBuilder()
                    .uri(URI.create(targetUrl))
                    .header("apikey", SUPABASE_KEY)
                    .header("Authorization", "Bearer " + token)
                    .header("Accept", "application/json")
                    .GET()
                    .build();

            HttpResponse<String> response = HTTP_CLIENT.send(request, HttpResponse.BodyHandlers.ofString());
            System.out.println("[GET] /api/students " + (search != null ? "(Search: " + search + ") " : "") + "-> " + response.statusCode());
            sendJsonResponse(exchange, response.statusCode(), response.body());
        }

        // CREATE Student
        private void handlePost(HttpExchange exchange, String token) throws Exception {
            String body = readRequestBody(exchange);
            String regNo = extractJsonValue(body, "register_no");
            String name = extractJsonValue(body, "name");
            String department = extractJsonValue(body, "department");
            String yearStr = extractJsonValue(body, "year");
            String email = extractJsonValue(body, "email");

            // Server-side Validation
            if (regNo == null || regNo.trim().isEmpty()) {
                sendJsonResponse(exchange, 400, "{\"error\":\"Register Number is required.\"}");
                return;
            }
            if (name == null || name.trim().isEmpty()) {
                sendJsonResponse(exchange, 400, "{\"error\":\"Student Name is required.\"}");
                return;
            }
            if (department == null || department.trim().isEmpty()) {
                sendJsonResponse(exchange, 400, "{\"error\":\"Department is required.\"}");
                return;
            }
            int year = 1;
            try {
                year = Integer.parseInt(yearStr != null ? yearStr.trim() : "1");
                if (year < 1 || year > 4) throw new IllegalArgumentException();
            } catch (Exception e) {
                sendJsonResponse(exchange, 400, "{\"error\":\"Year must be an integer between 1 and 4.\"}");
                return;
            }
            if (email == null || !email.contains("@")) {
                sendJsonResponse(exchange, 400, "{\"error\":\"Valid student email is required.\"}");
                return;
            }

            // Clean Payload
            String payload = String.format(
                    "{\"register_no\":\"%s\",\"name\":\"%s\",\"department\":\"%s\",\"year\":%d,\"email\":\"%s\"}",
                    escapeJson(regNo.trim().toUpperCase()),
                    escapeJson(name.trim()),
                    escapeJson(department.trim()),
                    year,
                    escapeJson(email.trim().toLowerCase())
            );

            HttpRequest request = HttpRequest.newBuilder()
                    .uri(URI.create(SUPABASE_URL + "/rest/v1/students"))
                    .header("apikey", SUPABASE_KEY)
                    .header("Authorization", "Bearer " + token)
                    .header("Content-Type", "application/json")
                    .header("Prefer", "return=representation")
                    .POST(HttpRequest.BodyPublishers.ofString(payload))
                    .build();

            HttpResponse<String> response = HTTP_CLIENT.send(request, HttpResponse.BodyHandlers.ofString());

            if (response.statusCode() == 201) {
                System.out.println("[POST] Student Created: " + regNo);
                // Return single object if array returned
                String respBody = response.body().trim();
                if (respBody.startsWith("[") && respBody.endsWith("]")) {
                    respBody = respBody.substring(1, respBody.length() - 1);
                }
                sendJsonResponse(exchange, 201, respBody);
            } else {
                System.out.println("[POST] Insert failed (" + response.statusCode() + "): " + response.body());
                sendJsonResponse(exchange, response.statusCode(), formatPostgreSqlError(response.body()));
            }
        }

        // UPDATE Student
        private void handlePut(HttpExchange exchange, String path, String token) throws Exception {
            String studentId = extractIdFromPath(path);
            if (studentId == null) {
                sendJsonResponse(exchange, 400, "{\"error\":\"Student ID missing in URL path.\"}");
                return;
            }

            String body = readRequestBody(exchange);
            String regNo = extractJsonValue(body, "register_no");
            String name = extractJsonValue(body, "name");
            String department = extractJsonValue(body, "department");
            String yearStr = extractJsonValue(body, "year");
            String email = extractJsonValue(body, "email");

            int year = 1;
            try {
                year = Integer.parseInt(yearStr != null ? yearStr.trim() : "1");
            } catch (Exception ignored) {}

            String payload = String.format(
                    "{\"register_no\":\"%s\",\"name\":\"%s\",\"department\":\"%s\",\"year\":%d,\"email\":\"%s\"}",
                    escapeJson(regNo != null ? regNo.trim().toUpperCase() : ""),
                    escapeJson(name != null ? name.trim() : ""),
                    escapeJson(department != null ? department.trim() : ""),
                    year,
                    escapeJson(email != null ? email.trim().toLowerCase() : "")
            );

            HttpRequest request = HttpRequest.newBuilder()
                    .uri(URI.create(SUPABASE_URL + "/rest/v1/students?id=eq." + studentId))
                    .header("apikey", SUPABASE_KEY)
                    .header("Authorization", "Bearer " + token)
                    .header("Content-Type", "application/json")
                    .header("Prefer", "return=representation")
                    .method("PATCH", HttpRequest.BodyPublishers.ofString(payload))
                    .build();

            HttpResponse<String> response = HTTP_CLIENT.send(request, HttpResponse.BodyHandlers.ofString());

            if (response.statusCode() == 200) {
                System.out.println("[PUT] Student Updated ID: " + studentId);
                String respBody = response.body().trim();
                if (respBody.startsWith("[") && respBody.endsWith("]")) {
                    respBody = respBody.substring(1, respBody.length() - 1);
                }
                sendJsonResponse(exchange, 200, respBody);
            } else {
                sendJsonResponse(exchange, response.statusCode(), formatPostgreSqlError(response.body()));
            }
        }

        // DELETE Student
        private void handleDelete(HttpExchange exchange, String path, String token) throws Exception {
            String studentId = extractIdFromPath(path);
            if (studentId == null) {
                sendJsonResponse(exchange, 400, "{\"error\":\"Student ID missing in URL path.\"}");
                return;
            }

            HttpRequest request = HttpRequest.newBuilder()
                    .uri(URI.create(SUPABASE_URL + "/rest/v1/students?id=eq." + studentId))
                    .header("apikey", SUPABASE_KEY)
                    .header("Authorization", "Bearer " + token)
                    .DELETE()
                    .build();

            HttpResponse<String> response = HTTP_CLIENT.send(request, HttpResponse.BodyHandlers.ofString());

            if (response.statusCode() == 200 || response.statusCode() == 204) {
                System.out.println("[DELETE] Student Deleted ID: " + studentId);
                sendJsonResponse(exchange, 200, "{\"success\":true,\"id\":" + studentId + "}");
            } else {
                sendJsonResponse(exchange, response.statusCode(), formatPostgreSqlError(response.body()));
            }
        }
    }

    // --------------------------------------------------------------------------
    // 5. Utility & Helper Methods
    // --------------------------------------------------------------------------
    private static void addCorsHeaders(HttpExchange exchange) {
        exchange.getResponseHeaders().set("Access-Control-Allow-Origin", "*");
        exchange.getResponseHeaders().set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
        exchange.getResponseHeaders().set("Access-Control-Allow-Headers", "Content-Type, Authorization, apikey");
    }

    private static void sendJsonResponse(HttpExchange exchange, int statusCode, String responseText) throws IOException {
        byte[] bytes = responseText.getBytes(StandardCharsets.UTF_8);
        exchange.getResponseHeaders().set("Content-Type", "application/json; charset=utf-8");
        exchange.sendResponseHeaders(statusCode, bytes.length);
        try (OutputStream os = exchange.getResponseBody()) {
            os.write(bytes);
        }
    }

    private static String readRequestBody(HttpExchange exchange) throws IOException {
        try (InputStream is = exchange.getRequestBody();
             Scanner s = new Scanner(is, StandardCharsets.UTF_8).useDelimiter("\\A")) {
            return s.hasNext() ? s.next() : "";
        }
    }

    private static String extractBearerToken(HttpExchange exchange) {
        List<String> authHeaders = exchange.getRequestHeaders().get("Authorization");
        if (authHeaders != null && !authHeaders.isEmpty()) {
            String header = authHeaders.get(0);
            if (header.startsWith("Bearer ")) {
                return header.substring(7).trim();
            }
            return header.trim();
        }
        return null;
    }

    private static String extractIdFromPath(String path) {
        String[] parts = path.split("/");
        if (parts.length > 0) {
            String last = parts[parts.length - 1];
            if (last.matches("\\d+")) {
                return last;
            }
        }
        return null;
    }

    private static String extractJsonValue(String json, String key) {
        if (json == null) return null;
        Pattern pattern = Pattern.compile("\"" + Pattern.quote(key) + "\"\\s*:\\s*(?:\"([^\"]*)\"|([^,}\\]\\s]+))");
        Matcher matcher = pattern.matcher(json);
        if (matcher.find()) {
            return matcher.group(1) != null ? matcher.group(1) : matcher.group(2);
        }
        return null;
    }

    private static String escapeJson(String input) {
        if (input == null) return "";
        return input.replace("\\", "\\\\")
                    .replace("\"", "\\\"")
                    .replace("\b", "\\b")
                    .replace("\f", "\\f")
                    .replace("\n", "\\n")
                    .replace("\r", "\\r")
                    .replace("\t", "\\t");
    }

    private static String formatPostgreSqlError(String errorJson) {
        if (errorJson.contains("students_teacher_register_no_unique") || errorJson.contains("23505")) {
            return "{\"error\":\"A student with this Register Number already exists in your records.\"}";
        }
        if (errorJson.contains("23514") || errorJson.contains("check constraint")) {
            return "{\"error\":\"Validation error: Year must be between 1 and 4.\"}";
        }
        return errorJson;
    }
}

