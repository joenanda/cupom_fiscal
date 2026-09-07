using System;
using System.ComponentModel;
using System.Diagnostics;
using System.Drawing;
using System.IO;
using System.Net;
using System.Reflection;
using System.Threading;
using System.Windows.Forms;

namespace SistemaCupomFiscal.Installer
{
    static class Setup
    {
        public const string DEVELOPER_NAME = "Criado e desenvolvido por GUARÁ SEGURANÇA E INTERNET";
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

                // Executa interface gráfica moderna do instalador Guará
                Application.Run(new InstallerForm(sourceDir, installDir, installedExe));
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

        public static Image ObterLogo()
        {
            try
            {
                // 1. Tenta carregar do recurso embutido
                Stream resStream = Assembly.GetExecutingAssembly().GetManifestResourceStream("Logo");
                if (resStream != null)
                {
                    return Image.FromStream(resStream);
                }
            }
            catch { }

            try
            {
                // 2. Tenta carregar de arquivo local se existir
                string localPng = Path.Combine(AppDomain.CurrentDomain.BaseDirectory, "logo.png");
                if (File.Exists(localPng)) return Image.FromFile(localPng);

                string assetsPng = Path.Combine(AppDomain.CurrentDomain.BaseDirectory, "public", "assets", "logo.png");
                if (File.Exists(assetsPng)) return Image.FromFile(assetsPng);
            }
            catch { }

            return null;
        }

        public static void CriarAtalhos(string installDir, string installedExe)
        {
            try
            {
                string iconPath = Path.Combine(installDir, "app.ico");
                if (!File.Exists(iconPath)) iconPath = installedExe;

                // Atalho na Área de Trabalho
                string desktopPath = Environment.GetFolderPath(Environment.SpecialFolder.DesktopDirectory);
                string shortcutDesktop = Path.Combine(desktopPath, "Sistema Cupom Fiscal NFC-e.lnk");
                CreateShortcut(shortcutDesktop, installedExe, installDir, "Sistema de Download de Cupom Fiscal NFC-e (Mod 65) - GUARÁ SEGURANÇA E INTERNET", iconPath);

                // Atalho no Menu Iniciar
                string startMenuPath = Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.StartMenu), "Programs", "Sistema Cupom Fiscal");
                if (!Directory.Exists(startMenuPath))
                {
                    Directory.CreateDirectory(startMenuPath);
                }
                string shortcutStart = Path.Combine(startMenuPath, "Sistema Cupom Fiscal NFC-e.lnk");
                CreateShortcut(shortcutStart, installedExe, installDir, "Sistema Fiscal NFC-e - GUARÁ SEGURANÇA E INTERNET", iconPath);
            }
            catch { }
        }

        private static void CreateShortcut(string shortcutPath, string targetPath, string workingDir, string description, string iconPath)
        {
            try
            {
                Type shellType = Type.GetTypeFromProgID("WScript.Shell");
                dynamic shell = Activator.CreateInstance(shellType);
                dynamic shortcut = shell.CreateShortcut(shortcutPath);
                shortcut.TargetPath = targetPath;
                shortcut.WorkingDirectory = workingDir;
                shortcut.Description = description;
                shortcut.IconLocation = iconPath + ",0";
                shortcut.Save();
            }
            catch { }
        }

        public static void CopyDirectory(string sourceDir, string targetDir, bool isRoot)
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
                try { File.Copy(file, destFile, true); } catch { }
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

    public class InstallerForm : Form
    {
        private string sourceDir;
        private string installDir;
        private string installedExe;

        private PictureBox picLogo;
        private Label lblTitle;
        private Label lblDeveloper;
        private Label lblStatus;
        private ProgressBar progressBar;
        private Button btnAction;
        private WebClient webClient;
        private string tempZip;

        public InstallerForm(string sourceDir, string installDir, string installedExe)
        {
            this.sourceDir = sourceDir;
            this.installDir = installDir;
            this.installedExe = installedExe;

            this.Text = "Instalador Oficial - Sistema Cupom Fiscal NFC-e";
            this.Size = new Size(580, 260);
            this.StartPosition = FormStartPosition.CenterScreen;
            this.FormBorderStyle = FormBorderStyle.FixedDialog;
            this.MaximizeBox = false;
            this.BackColor = Color.FromArgb(15, 23, 42); // Fundo Slate 900 elegante
            this.ForeColor = Color.White;

            // Ícone da janela
            try
            {
                string iconPath = Path.Combine(sourceDir, "app.ico");
                if (File.Exists(iconPath)) this.Icon = new Icon(iconPath);
            }
            catch { }

            // Logotipo Guará (Lobo/Raposa)
            picLogo = new PictureBox();
            picLogo.Size = new Size(96, 96);
            picLogo.Location = new Point(24, 24);
            picLogo.SizeMode = PictureBoxSizeMode.Zoom;
            picLogo.BackColor = Color.Transparent;
            Image logoImg = Setup.ObterLogo();
            if (logoImg != null)
            {
                picLogo.Image = logoImg;
            }
            this.Controls.Add(picLogo);

            // Título
            lblTitle = new Label();
            lblTitle.Text = "Sistema Cupom Fiscal NFC-e (Modelo 65)";
            lblTitle.Font = new Font("Segoe UI", 12, FontStyle.Bold);
            lblTitle.ForeColor = Color.FromArgb(56, 189, 248); // Azul Sky vibrante
            lblTitle.Location = new Point(135, 24);
            lblTitle.Size = new Size(410, 26);
            this.Controls.Add(lblTitle);

            // Desenvolvedor: GUARA SEGURANCA E INTERNET
            lblDeveloper = new Label();
            lblDeveloper.Text = Setup.DEVELOPER_NAME;
            lblDeveloper.Font = new Font("Segoe UI", 8.5f, FontStyle.Bold);
            lblDeveloper.ForeColor = Color.FromArgb(249, 115, 22); // Laranja oficial Guará
            lblDeveloper.Location = new Point(135, 52);
            lblDeveloper.Size = new Size(410, 20);
            this.Controls.Add(lblDeveloper);

            // Status da Instalação
            lblStatus = new Label();
            lblStatus.Text = "Iniciando processo de instalação...";
            lblStatus.Font = new Font("Segoe UI", 9, FontStyle.Regular);
            lblStatus.ForeColor = Color.FromArgb(203, 213, 225);
            lblStatus.Location = new Point(135, 82);
            lblStatus.Size = new Size(410, 22);
            this.Controls.Add(lblStatus);

            // Barra de Progresso
            progressBar = new ProgressBar();
            progressBar.Location = new Point(135, 112);
            progressBar.Size = new Size(405, 24);
            progressBar.Style = ProgressBarStyle.Marquee;
            this.Controls.Add(progressBar);

            // Rodapé / Botão
            btnAction = new Button();
            btnAction.Text = "Aguarde...";
            btnAction.Location = new Point(410, 165);
            btnAction.Size = new Size(130, 34);
            btnAction.FlatStyle = FlatStyle.Flat;
            btnAction.FlatAppearance.BorderSize = 0;
            btnAction.BackColor = Color.FromArgb(30, 41, 59);
            btnAction.ForeColor = Color.White;
            btnAction.Font = new Font("Segoe UI", 9, FontStyle.Bold);
            btnAction.Enabled = false;
            btnAction.Click += (s, e) => this.Close();
            this.Controls.Add(btnAction);

            Label lblFooter = new Label();
            lblFooter.Text = "Garantia de segurança e agilidade fiscal • Guará Internet";
            lblFooter.Font = new Font("Segoe UI", 7.5f, FontStyle.Regular);
            lblFooter.ForeColor = Color.FromArgb(100, 116, 139);
            lblFooter.Location = new Point(24, 175);
            lblFooter.Size = new Size(370, 20);
            this.Controls.Add(lblFooter);

            this.Shown += InstallerForm_Shown;
        }

        private void InstallerForm_Shown(object sender, EventArgs e)
        {
            Thread t = new Thread(ExecutarInstalacao);
            t.IsBackground = true;
            t.Start();
        }

        private void ExecutarInstalacao()
        {
            try
            {
                string localExeSource = Path.Combine(sourceDir, "SistemaCupomFiscal.exe");

                // Caso 1: Instalação a partir da pasta local da release
                if (File.Exists(localExeSource))
                {
                    this.Invoke(new Action(() => {
                        lblStatus.Text = "Instalando arquivos do sistema no computador...";
                    }));

                    if (!Directory.Exists(installDir))
                    {
                        Directory.CreateDirectory(installDir);
                    }

                    Setup.CopyDirectory(sourceDir, installDir, true);
                    Thread.Sleep(800);
                    ConcluirSucesso();
                    return;
                }

                // Caso 2: Instalador avulso (baixa pacote completo da release no GitHub)
                this.Invoke(new Action(() => {
                    lblStatus.Text = "Conectando ao GitHub para baixar os arquivos...";
                    progressBar.Style = ProgressBarStyle.Continuous;
                    progressBar.Value = 0;
                }));

                string tempDir = Path.Combine(Path.GetTempPath(), "SistemaCupomFiscalInstall");
                if (!Directory.Exists(tempDir)) Directory.CreateDirectory(tempDir);
                tempZip = Path.Combine(tempDir, "package.zip");

                webClient = new WebClient();
                webClient.Headers.Add("User-Agent", "SistemaCupomFiscal-Setup/1.0");
                webClient.DownloadProgressChanged += (s, ev) => {
                    this.Invoke(new Action(() => {
                        progressBar.Value = ev.ProgressPercentage;
                        lblStatus.Text = string.Format("Baixando arquivos do sistema... {0}% ({1:N1} MB)", ev.ProgressPercentage, ev.BytesReceived / 1048576.0);
                    }));
                };
                webClient.DownloadFileCompleted += (s, ev) => {
                    if (ev.Error != null)
                    {
                        this.Invoke(new Action(() => {
                            MessageBox.Show(
                                "Não foi possível baixar os arquivos automaticamente do GitHub:\n" + ev.Error.Message,
                                "Aviso de Instalação",
                                MessageBoxButtons.OK,
                                MessageBoxIcon.Warning
                            );
                            this.Close();
                        }));
                        return;
                    }

                    this.Invoke(new Action(() => {
                        lblStatus.Text = "Extraindo arquivos e configurando atalhos...";
                        progressBar.Style = ProgressBarStyle.Marquee;
                    }));

                    try
                    {
                        if (!Directory.Exists(installDir)) Directory.CreateDirectory(installDir);

                        ProcessStartInfo psi = new ProcessStartInfo();
                        psi.FileName = "powershell.exe";
                        psi.Arguments = string.Format("-NoProfile -ExecutionPolicy Bypass -Command \"Expand-Archive -Path '{0}' -DestinationPath '{1}' -Force\"", tempZip, installDir);
                        psi.WindowStyle = ProcessWindowStyle.Hidden;
                        psi.CreateNoWindow = true;
                        Process p = Process.Start(psi);
                        p.WaitForExit();

                        try { File.Delete(tempZip); } catch { }

                        ConcluirSucesso();
                    }
                    catch (Exception exExtract)
                    {
                        this.Invoke(new Action(() => {
                            MessageBox.Show("Erro ao descompactar: " + exExtract.Message, "Erro", MessageBoxButtons.OK, MessageBoxIcon.Error);
                            this.Close();
                        }));
                    }
                };

                webClient.DownloadFileAsync(new Uri(Setup.ZIP_DOWNLOAD_URL), tempZip);
            }
            catch (Exception ex)
            {
                this.Invoke(new Action(() => {
                    MessageBox.Show("Erro durante a instalação:\n" + ex.Message, "Falha", MessageBoxButtons.OK, MessageBoxIcon.Error);
                    this.Close();
                }));
            }
        }

        private void ConcluirSucesso()
        {
            this.Invoke(new Action(() => {
                Setup.CriarAtalhos(installDir, installedExe);

                lblStatus.Text = "✓ Instalação concluída com sucesso! Abrindo sistema...";
                lblStatus.ForeColor = Color.FromArgb(74, 222, 128); // Verde Sucesso
                progressBar.Style = ProgressBarStyle.Continuous;
                progressBar.Value = 100;

                btnAction.Text = "Concluído";
                btnAction.BackColor = Color.FromArgb(16, 185, 129);
                btnAction.Enabled = true;

                // Inicia o sistema
                try
                {
                    if (File.Exists(installedExe))
                    {
                        ProcessStartInfo psiStart = new ProcessStartInfo();
                        psiStart.FileName = installedExe;
                        psiStart.WorkingDirectory = installDir;
                        Process.Start(psiStart);
                    }
                }
                catch { }

                // Fecha a janela do instalador após 2.5 segundos ou se o usuário clicar
                System.Windows.Forms.Timer closeTimer = new System.Windows.Forms.Timer();
                closeTimer.Interval = 2500;
                closeTimer.Tick += (s, ev) => {
                    closeTimer.Stop();
                    this.Close();
                };
                closeTimer.Start();
            }));
        }
    }
}
