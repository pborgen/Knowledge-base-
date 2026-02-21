import Foundation

struct APIClient {
    private func headers(userEmail: String) -> [String: String] {
        ["Content-Type": "application/json", "x-user-email": userEmail]
    }

    func listSpaces(baseURL: String, userEmail: String) async throws -> [Space] {
        var req = URLRequest(url: URL(string: "\(baseURL)/api/spaces")!)
        req.addValue(userEmail, forHTTPHeaderField: "x-user-email")
        let (data, _) = try await URLSession.shared.data(for: req)
        let decoded = try JSONDecoder().decode(SpacesResponse.self, from: data)
        return decoded.spaces
    }

    func createSpace(baseURL: String, userEmail: String, name: String, visibility: String) async throws -> Space {
        var req = URLRequest(url: URL(string: "\(baseURL)/api/spaces")!)
        req.httpMethod = "POST"
        req.allHTTPHeaderFields = headers(userEmail: userEmail)
        req.httpBody = try JSONSerialization.data(withJSONObject: ["name": name, "visibility": visibility])
        let (data, _) = try await URLSession.shared.data(for: req)
        let obj = try JSONSerialization.jsonObject(with: data) as? [String: Any]
        guard let s = obj?["space"] else { throw NSError(domain: "API", code: 1) }
        let sData = try JSONSerialization.data(withJSONObject: s)
        return try JSONDecoder().decode(Space.self, from: sData)
    }

    func shareSpace(baseURL: String, userEmail: String, spaceId: String, targetEmail: String) async throws -> Space {
        var req = URLRequest(url: URL(string: "\(baseURL)/api/spaces/\(spaceId)/share")!)
        req.httpMethod = "POST"
        req.allHTTPHeaderFields = headers(userEmail: userEmail)
        req.httpBody = try JSONSerialization.data(withJSONObject: ["targetEmail": targetEmail])
        let (data, _) = try await URLSession.shared.data(for: req)
        let obj = try JSONSerialization.jsonObject(with: data) as? [String: Any]
        guard let s = obj?["space"] else { throw NSError(domain: "API", code: 1) }
        let sData = try JSONSerialization.data(withJSONObject: s)
        return try JSONDecoder().decode(Space.self, from: sData)
    }

    func setSpaceVisibility(baseURL: String, userEmail: String, spaceId: String, visibility: String) async throws -> Space {
        var req = URLRequest(url: URL(string: "\(baseURL)/api/spaces/\(spaceId)/visibility")!)
        req.httpMethod = "POST"
        req.allHTTPHeaderFields = headers(userEmail: userEmail)
        req.httpBody = try JSONSerialization.data(withJSONObject: ["visibility": visibility])
        let (data, _) = try await URLSession.shared.data(for: req)
        let obj = try JSONSerialization.jsonObject(with: data) as? [String: Any]
        guard let s = obj?["space"] else { throw NSError(domain: "API", code: 1) }
        let sData = try JSONSerialization.data(withJSONObject: s)
        return try JSONDecoder().decode(Space.self, from: sData)
    }

    func listDocuments(baseURL: String, userEmail: String, spaceId: String) async throws -> [DocumentItem] {
        var components = URLComponents(string: "\(baseURL)/api/documents")!
        components.queryItems = [URLQueryItem(name: "spaceId", value: spaceId)]
        var req = URLRequest(url: components.url!)
        req.addValue(userEmail, forHTTPHeaderField: "x-user-email")
        let (data, _) = try await URLSession.shared.data(for: req)
        let decoded = try JSONDecoder().decode(DocumentsResponse.self, from: data)
        return decoded.documents
    }

    func listPublicLibrary(baseURL: String) async throws -> [DocumentItem] {
        let req = URLRequest(url: URL(string: "\(baseURL)/api/public-library")!)
        let (data, _) = try await URLSession.shared.data(for: req)
        let decoded = try JSONDecoder().decode(DocumentsResponse.self, from: data)
        return decoded.documents
    }

    func setDocumentVisibility(baseURL: String, userEmail: String, docId: String, visibility: String) async throws {
        var req = URLRequest(url: URL(string: "\(baseURL)/api/documents/\(docId)/visibility")!)
        req.httpMethod = "POST"
        req.allHTTPHeaderFields = headers(userEmail: userEmail)
        req.httpBody = try JSONSerialization.data(withJSONObject: ["visibility": visibility])
        let (data, _) = try await URLSession.shared.data(for: req)
        let obj = try JSONSerialization.jsonObject(with: data) as? [String: Any]
        if (obj?["ok"] as? Bool) != true {
            throw NSError(domain: "API", code: 1, userInfo: [NSLocalizedDescriptionKey: (obj?["error"] as? String) ?? "Failed"])
        }
    }

    func answer(baseURL: String, question: String, userEmail: String, spaceId: String) async throws -> String {
        let url = URL(string: "\(baseURL)/api/answer")!
        var req = URLRequest(url: url)
        req.httpMethod = "POST"
        req.allHTTPHeaderFields = headers(userEmail: userEmail)
        req.httpBody = try JSONSerialization.data(withJSONObject: ["question": question, "topK": 8, "filters": ["spaceId": spaceId]])

        let (data, _) = try await URLSession.shared.data(for: req)
        let obj = try JSONSerialization.jsonObject(with: data) as? [String: Any]
        return (obj?["answer"] as? String) ?? (obj?["error"] as? String) ?? "No response"
    }

    func ingestGoogleDoc(baseURL: String, docUrl: String, idToken: String, accessToken: String, spaceId: String) async throws {
        let url = URL(string: "\(baseURL)/api/ingest/google-doc")!
        var req = URLRequest(url: url)
        req.httpMethod = "POST"
        req.addValue("application/json", forHTTPHeaderField: "Content-Type")
        req.httpBody = try JSONSerialization.data(withJSONObject: [
            "docUrl": docUrl,
            "idToken": idToken,
            "accessToken": accessToken,
            "spaceId": spaceId
        ])

        let (data, _) = try await URLSession.shared.data(for: req)
        let obj = try JSONSerialization.jsonObject(with: data) as? [String: Any]
        if (obj?["ok"] as? Bool) != true {
            throw NSError(domain: "API", code: 1, userInfo: [NSLocalizedDescriptionKey: (obj?["error"] as? String) ?? "Failed"]) }
    }

    func uploadFile(baseURL: String, fileURL: URL, owner: String, spaceId: String) async throws {
        let data = try Data(contentsOf: fileURL)
        let boundary = "Boundary-\(UUID().uuidString)"
        var req = URLRequest(url: URL(string: "\(baseURL)/api/ingest/upload")!)
        req.httpMethod = "POST"
        req.setValue("multipart/form-data; boundary=\(boundary)", forHTTPHeaderField: "Content-Type")
        req.setValue(owner, forHTTPHeaderField: "x-user-email")

        var body = Data()
        body.append("--\(boundary)\r\n".data(using: .utf8)!)
        body.append("Content-Disposition: form-data; name=\"owner\"\r\n\r\n".data(using: .utf8)!)
        body.append("\(owner)\r\n".data(using: .utf8)!)

        body.append("--\(boundary)\r\n".data(using: .utf8)!)
        body.append("Content-Disposition: form-data; name=\"spaceId\"\r\n\r\n".data(using: .utf8)!)
        body.append("\(spaceId)\r\n".data(using: .utf8)!)

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
