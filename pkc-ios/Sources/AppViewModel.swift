import Foundation
import SwiftUI

@MainActor
final class AppViewModel: ObservableObject {
    @Published var backendURL: String {
        didSet { UserDefaults.standard.set(backendURL, forKey: "backendURL") }
    }
    @Published var question: String = ""
    @Published var answer: String = ""
    @Published var status: String = ""
    @Published var ownerEmail: String {
        didSet { UserDefaults.standard.set(ownerEmail, forKey: "ownerEmail") }
    }

    private let api = APIClient()

    init() {
        self.backendURL = UserDefaults.standard.string(forKey: "backendURL") ?? "http://YOUR-HOST-IP:8787"
        self.ownerEmail = UserDefaults.standard.string(forKey: "ownerEmail") ?? "local"
    }

    func ask() async {
        let trimmed = question.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !trimmed.isEmpty else { return }
        do {
            status = "Querying..."
            answer = try await api.answer(baseURL: backendURL, question: trimmed)
            status = "Done"
        } catch {
            status = "Error: \(error.localizedDescription)"
        }
    }

    func uploadFile(url: URL) async {
        do {
            status = "Uploading \(url.lastPathComponent)..."
            try await api.uploadFile(baseURL: backendURL, fileURL: url, owner: ownerEmail)
            status = "Uploaded + ingested"
        } catch {
            status = "Upload error: \(error.localizedDescription)"
        }
    }

    func ingestGoogleDoc(docUrl: String, idToken: String, accessToken: String) async {
        do {
            status = "Ingesting Google Doc..."
            try await api.ingestGoogleDoc(baseURL: backendURL, docUrl: docUrl, idToken: idToken, accessToken: accessToken)
            status = "Google Doc ingested"
        } catch {
            status = "Google ingest error: \(error.localizedDescription)"
        }
    }
}
