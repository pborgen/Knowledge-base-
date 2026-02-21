import SwiftUI

struct OnboardingView: View {
    @Binding var hasCompletedOnboarding: Bool

    var body: some View {
        VStack(spacing: 20) {
            Spacer()
            Image(systemName: "brain.head.profile")
                .font(.system(size: 56))
            Text("Welcome to Knowledge Base")
                .font(.title2).bold()
            Text("Connect your backend, upload docs, and ask questions from your iPhone.")
                .multilineTextAlignment(.center)
                .foregroundStyle(.secondary)
                .padding(.horizontal)

            VStack(alignment: .leading, spacing: 10) {
                Label("Set backend URL", systemImage: "network")
                Label("Upload from Files", systemImage: "square.and.arrow.up")
                Label("Ingest Google Docs", systemImage: "doc.text")
            }
            .padding()
            .frame(maxWidth: .infinity, alignment: .leading)
            .background(Color(.tertiarySystemBackground))
            .clipShape(RoundedRectangle(cornerRadius: 12))
            .padding(.horizontal)

            Button("Get Started") {
                hasCompletedOnboarding = true
                UserDefaults.standard.set(true, forKey: "hasCompletedOnboarding")
            }
            .buttonStyle(.borderedProminent)
            .padding(.horizontal)

            Spacer()
        }
        .padding()
    }
}
