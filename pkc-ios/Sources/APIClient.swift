import Foundation

struct APIClient {
    func answer(baseURL: String, question: String) async throws -> String {
        let url = URL(string: "\(baseURL)/api/answer")!
        var req = URLRequest(url: url)
        req.httpMethod = "POST"
        req.addValue("application/json", forHTTPHeaderField: "Content-Type")
        req.httpBody = try JSONSerialization.data(withJSONObject: ["question": question, "topK": 8])

        let (data, _) = try await URLSession.shared.data(for: req)
        let obj = try JSONSerialization.jsonObject(with: data) as? [String: Any]
        return (obj?["answer"] as? String) ?? (obj?["error"] as? String) ?? "No response"
    }

    func ingestGoogleDoc(baseURL: String, docUrl: String, idToken: String, accessToken: String) async throws {
        let url = URL(string: "\(baseURL)/api/ingest/google-doc")!
        var req = URLRequest(url: url)
        req.httpMethod = "POST"
        req.addValue("application/json", forHTTPHeaderField: "Content-Type")
        req.httpBody = try JSONSerialization.data(withJSONObject: [
            "docUrl": docUrl,
            "idToken": idToken,
            "accessToken": accessToken
        ])

        let (data, _) = try await URLSession.shared.data(for: req)
        let obj = try JSONSerialization.jsonObject(with: data) as? [String: Any]
        if (obj?["ok"] as? Bool) != true {
            throw NSError(domain: "API", code: 1, userInfo: [NSLocalizedDescriptionKey: (obj?["error"] as? String) ?? "Failed"]) }
    }

    func uploadFile(baseURL: String, fileURL: URL, owner: String) async throws {
        let data = try Data(contentsOf: fileURL)
        let boundary = "Boundary-\(UUID().uuidString)"
        var req = URLRequest(url: URL(string: "\(baseURL)/api/ingest/upload")!)
        req.httpMethod = "POST"
        req.setValue("multipart/form-data; boundary=\(boundary)", forHTTPHeaderField: "Content-Type")

        var body = Data()
        body.append("--\(boundary)\r\n".data(using: .utf8)!)
        body.append("Content-Disposition: form-data; name=\"owner\"\r\n\r\n".data(using: .utf8)!)
        body.append("\(owner)\r\n".data(using: .utf8)!)

        body.append("--\(boundary)\r\n".data(using: .utf8)!)
        body.append("Content-Disposition: form-data; name=\"file\"; filename=\"\(fileURL.lastPathComponent)\"\r\n".data(using: .utf8)!)
        body.append("Content-Type: application/octet-stream\r\n\r\n".data(using: .utf8)!)
        body.append(data)
        body.append("\r\n--\(boundary)--\r\n".data(using: .utf8)!)
        req.httpBody = body

        let (respData, _) = try await URLSession.shared.data(for: req)
        let obj = try JSONSerialization.jsonObject(with: respData) as? [String: Any]
        if (obj?["ok"] as? Bool) != true {
            throw NSError(domain: "Upload", code: 1, userInfo: [NSLocalizedDescriptionKey: (obj?["error"] as? String) ?? "Upload failed"]) }
    }
}
