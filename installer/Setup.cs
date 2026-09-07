using System;
using System.ComponentModel;
using System.Diagnostics;
using System.Drawing;
using System.IO;
using System.Net;
using System.Reflection;
using System.Windows.Forms;

namespace SistemaCupomFiscal.Installer
{
    static class Setup
    {
        public const string REPO_URL = "https://github.com/joenanda/cupom_fiscal";
        public const string ZIP_DOWNLOAD_URL = "https://github.com/joenanda/cupom_fiscal/releases/latest/download/SistemaCupomFiscal-completo.zip";

        [STAThread]
        static void Main()
        {
            Application.EnableVisualStyles();
            Application.SetCompatibleTextRenderingDefault(false);

            try
            {
                ServicePointManager.SecurityProtocol = SecurityProtocolType.Tls12;

                string sourceDir = AppDomain.CurrentDomain.BaseDirectory;
                string localAppData = Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData);
                string installDir = Path.Combine(localAppData, "SistemaCupomFiscal");
                string installedExe = Path.Combine(installDir, "SistemaCupomFiscal.exe");

                // Caso 1: Arquivos locais estão presentes na mesma pasta (instalação offline / pacote descompactado)
                string localExeSource = Path.Combine(sourceDir, "SistemaCupomFiscal.exe");
                if (File.Exists(localExeSource))
                {
                    if (!Directory.Exists(installDir))
                    {
                        Directory.CreateDirectory(installDir);
                    }

                    CopyDirectory(sourceDir, installDir, true);
                    FinalizarInstalacao(installDir, installedExe);
                    return;
                }

                // Caso 2: Instalador executado avulso (baixa o pacote completo do GitHub)
                Application.Run(new DownloadInstallerForm(installDir, installedExe));
            }
            catch (Exception ex)
            {
                MessageBox.Show(
                    "Ocorreu um erro durante a instalação:\n" + ex.Message,
                    "Falha no Instalador",
                    MessageBoxButtons.OK,
                    MessageBoxIcon.Error
                );
            }
        }

        public static void FinalizarInstalacao(string installDir, string installedExe)
        {
            if (!File.Exists(installedExe))
            {
                MessageBox.Show(
                    "Erro: O executável do sistema não foi localizado em:\n" + installedExe,
                    "Erro de Instalação",
                    MessageBoxButtons.OK,
                    MessageBoxIcon.Error
                );
                return;
            }

            // Cria Atalho na Área de Trabalho
            string desktopPath = Environment.GetFolderPath(Environment.SpecialFolder.DesktopDirectory);
            string shortcutDesktop = Path.Combine(desktopPath, "Sistema Cupom Fiscal NFC-e.lnk");
            CreateShortcut(shortcutDesktop, installedExe, installDir, "Sistema de Download e Consulta de Cupom Fiscal Eletrônico NFC-e");

            // Cria Atalho no Menu Iniciar
            string startMenuPath = Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.StartMenu), "Programs", "Sistema Cupom Fiscal");
            if (!Directory.Exists(startMenuPath))
            {
                Directory.CreateDirectory(startMenuPath);
            }
            string shortcutStart = Path.Combine(startMenuPath, "Sistema Cupom Fiscal NFC-e.lnk");
            CreateShortcut(shortcutStart, installedExe, installDir, "Sistema Fiscal NFC-e");

            // Inicia o aplicativo imediatamente
            ProcessStartInfo psi = new ProcessStartInfo();
            psi.FileName = installedExe;
            psi.WorkingDirectory = installDir;
            Process.Start(psi);

            MessageBox.Show(
                "Instalação concluída com sucesso!\n\n" +
                "✓ Aplicativo instalado em: " + installDir + "\n" +
                "✓ Atalho criado na sua Área de Trabalho\n" +
                "✓ O sistema está rodando e abrindo no navegador.",
                "Sistema Fiscal NFC-e Instalado",
                MessageBoxButtons.OK,
                MessageBoxIcon.Information
            );
        }

        private static void CreateShortcut(string shortcutPath, string targetPath, string workingDir, string description)
        {
            try
            {
                Type shellType = Type.GetTypeFromProgID("WScript.Shell");
                dynamic shell = Activator.CreateInstance(shellType);
                dynamic shortcut = shell.CreateShortcut(shortcutPath);
                shortcut.TargetPath = targetPath;
                shortcut.WorkingDirectory = workingDir;
                shortcut.Description = description;
                shortcut.IconLocation = targetPath + ",0";
                shortcut.Save();
            }
            catch { }
        }

        private static void CopyDirectory(string sourceDir, string targetDir, bool isRoot)
        {
            Directory.CreateDirectory(targetDir);

            foreach (string file in Directory.GetFiles(sourceDir))
            {
                string fileName = Path.GetFileName(file);
                if (isRoot && fileName.StartsWith("Instalador", StringComparison.OrdinalIgnoreCase))
                {
                    continue;
                }

                string destFile = Path.Combine(targetDir, fileName);
                try
                {
                    File.Copy(file, destFile, true);
                }
                catch { }
            }

            foreach (string subDir in Directory.GetDirectories(sourceDir))
            {
                string dirName = Path.GetFileName(subDir);
                if (dirName.Equals("temp_update", StringComparison.OrdinalIgnoreCase))
                {
                    continue;
                }

                string destSubDir = Path.Combine(targetDir, dirName);
                CopyDirectory(subDir, destSubDir, false);
            }
        }
    }

    public class DownloadInstallerForm : Form
    {
        private string installDir;
        private string installedExe;
        private ProgressBar progressBar;
        private Label statusLabel;
        private WebClient webClient;
        private string tempZip;

        public DownloadInstallerForm(string installDir, string installedExe)
        {
            this.installDir = installDir;
            this.installedExe = installedExe;

            this.Text = "Instalador - Sistema Cupom Fiscal NFC-e";
            this.Size = new Size(500, 210);
            this.StartPosition = FormStartPosition.CenterScreen;
            this.FormBorderStyle = FormBorderStyle.FixedDialog;
            this.MaximizeBox = false;
            this.BackColor = Color.FromArgb(24, 27, 34);
            this.ForeColor = Color.White;

            Label title = new Label();
            title.Text = "Instalação Automática - Sistema Cupom Fiscal NFC-e";
            title.Font = new Font("Segoe UI", 11, FontStyle.Bold);
            title.ForeColor = Color.FromArgb(56, 189, 248);
            title.Location = new Point(20, 18);
            title.Size = new Size(450, 25);
            this.Controls.Add(title);

            statusLabel = new Label();
            statusLabel.Text = "Conectando ao GitHub para baixar os arquivos do sistema...";
            statusLabel.Font = new Font("Segoe UI", 9, FontStyle.Regular);
            statusLabel.ForeColor = Color.FromArgb(203, 213, 225);
            statusLabel.Location = new Point(20, 50);
            statusLabel.Size = new Size(450, 25);
            this.Controls.Add(statusLabel);

            progressBar = new ProgressBar();
            progressBar.Location = new Point(20, 85);
            progressBar.Size = new Size(445, 26);
            progressBar.Style = ProgressBarStyle.Continuous;
            this.Controls.Add(progressBar);

            this.Load += DownloadInstallerForm_Load;
        }

        private void DownloadInstallerForm_Load(object sender, EventArgs e)
        {
            StartDownload();
        }

        private void StartDownload()
        {
            try
            {
                string tempDir = Path.Combine(Path.GetTempPath(), "SistemaCupomFiscalInstall");
                if (!Directory.Exists(tempDir))
                {
                    Directory.CreateDirectory(tempDir);
                }
                tempZip = Path.Combine(tempDir, "package.zip");

                webClient = new WebClient();
                webClient.Headers.Add("User-Agent", "SistemaCupomFiscal-Setup/1.0");
                webClient.DownloadProgressChanged += (s, ev) =>
                {
                    progressBar.Value = ev.ProgressPercentage;
                    statusLabel.Text = string.Format("Baixando arquivos... {0}% ({1:N1} MB)", ev.ProgressPercentage, ev.BytesReceived / 1048576.0);
                };
                webClient.DownloadFileCompleted += WebClient_DownloadFileCompleted;

                // Tenta URL do release mais recente
                string downloadUrl = "https://github.com/joenanda/cupom_fiscal/releases/latest/download/SistemaCupomFiscal-completo.zip";
                webClient.DownloadFileAsync(new Uri(downloadUrl), tempZip);
            }
            catch (Exception ex)
            {
                MessageBox.Show("Falha ao iniciar download: " + ex.Message, "Erro", MessageBoxButtons.OK, MessageBoxIcon.Error);
                this.Close();
            }
        }

        private void WebClient_DownloadFileCompleted(object sender, AsyncCompletedEventArgs e)
        {
            if (e.Error != null)
            {
                MessageBox.Show(
                    "Não foi possível baixar os arquivos automaticamente do GitHub:\n" + e.Error.Message +
                    "\n\nCertifique-se de que há conexão com a internet e que a versão mais recente está publicada no repositório:\nhttps://github.com/joenanda/cupom_fiscal",
                    "Falha no Download",
                    MessageBoxButtons.OK,
                    MessageBoxIcon.Warning
                );
                this.Close();
                return;
            }

            statusLabel.Text = "Extraindo arquivos e configurando o sistema no PC...";
            progressBar.Style = ProgressBarStyle.Marquee;

            try
            {
                if (!Directory.Exists(installDir))
                {
                    Directory.CreateDirectory(installDir);
                }

                // Usa PowerShell nativo do Windows para descompactar com 100% de compatibilidade
                ProcessStartInfo psi = new ProcessStartInfo();
                psi.FileName = "powershell.exe";
                psi.Arguments = string.Format("-NoProfile -ExecutionPolicy Bypass -Command \"Expand-Archive -Path '{0}' -DestinationPath '{1}' -Force\"", tempZip, installDir);
                psi.WindowStyle = ProcessWindowStyle.Hidden;
                psi.CreateNoWindow = true;

                Process p = Process.Start(psi);
                p.WaitForExit();

                try { File.Delete(tempZip); } catch { }

                this.Hide();
                Setup.FinalizarInstalacao(installDir, installedExe);
                this.Close();
            }
            catch (Exception ex)
            {
                MessageBox.Show("Erro ao descompactar arquivos: " + ex.Message, "Erro", MessageBoxButtons.OK, MessageBoxIcon.Error);
                this.Close();
            }
        }
    }
}
