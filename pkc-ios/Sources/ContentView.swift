import SwiftUI
import UniformTypeIdentifiers

struct ContentView: View {
    @EnvironmentObject var vm: AppViewModel
    @State private var showPicker = false
    @State private var googleDocURL = ""

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(spacing: 14) {
                    card("Backend") {
                        TextField("http://YOUR-HOST-IP:8787", text: $vm.backendURL)
                            .keyboardType(.URL)
                            .textInputAutocapitalization(.never)
                            .autocorrectionDisabled()
                            .padding(10)
                            .background(Color(.secondarySystemBackground))
                            .clipShape(RoundedRectangle(cornerRadius: 10))

                        TextField("Owner email (for metadata)", text: $vm.ownerEmail)
                            .textInputAutocapitalization(.never)
                            .autocorrectionDisabled()
                            .padding(10)
                            .background(Color(.secondarySystemBackground))
                            .clipShape(RoundedRectangle(cornerRadius: 10))
                    }

                    card("Add documents") {
                        Button {
                            showPicker = true
                        } label: {
                            Label("Upload file from iPhone", systemImage: "square.and.arrow.up")
                                .frame(maxWidth: .infinity)
                        }
                        .buttonStyle(.borderedProminent)

                        TextField("Google Doc URL", text: $googleDocURL)
                            .textInputAutocapitalization(.never)
                            .autocorrectionDisabled()
                            .padding(10)
                            .background(Color(.secondarySystemBackground))
                            .clipShape(RoundedRectangle(cornerRadius: 10))

                        Button("Sign in with Google + Ingest Doc") {
                            Task { await signInAndIngestGoogleDoc() }
                        }
                        .buttonStyle(.bordered)
                        .frame(maxWidth: .infinity)
                    }

                    card("Ask") {
                        TextField("Ask a question", text: $vm.question, axis: .vertical)
                            .lineLimit(3...8)
                            .padding(10)
                            .background(Color(.secondarySystemBackground))
                            .clipShape(RoundedRectangle(cornerRadius: 10))

                        Button("Ask knowledge base") {
                            Task { await vm.ask() }
                        }
                        .buttonStyle(.borderedProminent)
                        .frame(maxWidth: .infinity)

                        if !vm.answer.isEmpty {
                            Text(vm.answer)
                                .font(.footnote)
                                .frame(maxWidth: .infinity, alignment: .leading)
                                .padding(10)
                                .background(Color(.secondarySystemBackground))
                                .clipShape(RoundedRectangle(cornerRadius: 10))
                        }
                    }

                    if !vm.status.isEmpty {
                        Text(vm.status)
                            .font(.footnote)
                            .foregroundStyle(.secondary)
                            .frame(maxWidth: .infinity, alignment: .leading)
                    }
                }
                .padding()
            }
            .navigationTitle("Knowledge Base")
            .fileImporter(isPresented: $showPicker, allowedContentTypes: [.data], allowsMultipleSelection: false) { result in
                switch result {
                case .success(let urls):
                    guard let url = urls.first else { return }
                    let granted = url.startAccessingSecurityScopedResource()
                    Task {
                        await vm.uploadFile(url: url)
                        if granted { url.stopAccessingSecurityScopedResource() }
                    }
                case .failure(let error):
                    vm.status = "Picker error: \(error.localizedDescription)"
                }
            }
        }
    }

    @ViewBuilder
    private func card(_ title: String, @ViewBuilder content: () -> some View) -> some View {
        VStack(alignment: .leading, spacing: 10) {
            Text(title).font(.headline)
            content()
        }
        .padding()
        .background(Color(.tertiarySystemBackground))
        .clipShape(RoundedRectangle(cornerRadius: 14))
    }

    private func signInAndIngestGoogleDoc() async {
        guard let scene = UIApplication.shared.connectedScenes.first as? UIWindowScene,
              let root = scene.windows.first?.rootViewController else {
            vm.status = "No root view controller"
            return
        }

        do {
            let tokens = try await GoogleSignInManager.shared.signIn(presentingViewController: root)
            vm.ownerEmail = tokens.email
            await vm.ingestGoogleDoc(docUrl: googleDocURL, idToken: tokens.idToken, accessToken: tokens.accessToken)
        } catch {
            vm.status = "Google sign-in error: \(error.localizedDescription)"
        }
    }
}
