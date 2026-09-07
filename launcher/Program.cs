using System;
using System.Diagnostics;
using System.Drawing;
using System.IO;
using System.Reflection;
using System.Threading;
using System.Windows.Forms;

namespace SistemaCupomFiscal
{
    public class MainForm : Form
    {
        private Process serverProcess = null;
        private NotifyIcon trayIcon = null;
        private bool isClosing = false;

        public MainForm()
        {
            this.Text = "Sistema Cupom Fiscal NFC-e";
            this.WindowState = FormWindowState.Minimized;
            this.ShowInTaskbar = false;
            this.FormBorderStyle = FormBorderStyle.FixedToolWindow;
            this.Width = 0;
            this.Height = 0;

            string appDir = AppDomain.CurrentDomain.BaseDirectory;

            // Carrega ícone oficial (Guará)
            Icon appIcon = null;
            string iconPath = Path.Combine(appDir, "app.ico");
            if (File.Exists(iconPath))
            {
                try { appIcon = new Icon(iconPath); } catch { }
            }
            if (appIcon == null)
            {
                try
                {
                    Stream resStream = Assembly.GetExecutingAssembly().GetManifestResourceStream("Logo");
                    if (resStream != null)
                    {
                        using (Bitmap bmp = new Bitmap(resStream))
                        {
                            IntPtr hIcon = bmp.GetHicon();
                            appIcon = Icon.FromHandle(hIcon);
                        }
                    }
                }
                catch { }
            }
            if (appIcon == null) appIcon = SystemIcons.Shield;

            this.Icon = appIcon;

            string nodePath = Path.Combine(appDir, "bin", "node.exe");
            if (!File.Exists(nodePath)) nodePath = Path.Combine(appDir, "node.exe");
            if (!File.Exists(nodePath)) nodePath = "node.exe";

            string serverScript = Path.Combine(appDir, "dist", "src", "server.js");
            if (!File.Exists(serverScript)) serverScript = Path.Combine(appDir, "server.js");

            if (!File.Exists(serverScript))
            {
                MessageBox.Show(
                    "Não foi possível localizar o arquivo 'server.js' na pasta dist.\nVerifique os arquivos da aplicação.",
                    "Erro ao Iniciar o Sistema",
                    MessageBoxButtons.OK,
                    MessageBoxIcon.Error
                );
                Environment.Exit(1);
                return;
            }

            // Inicia o processo Node em segundo plano
            ProcessStartInfo psi = new ProcessStartInfo();
            psi.FileName = nodePath;
            psi.Arguments = "\"" + serverScript + "\"";
            psi.WorkingDirectory = appDir;
            psi.UseShellExecute = false;
            psi.CreateNoWindow = true;
            psi.EnvironmentVariables["PORT"] = "3000";
            psi.EnvironmentVariables["AUTO_OPEN_BROWSER"] = "true";

            try
            {
                serverProcess = Process.Start(psi);
                if (serverProcess != null)
                {
                    serverProcess.EnableRaisingEvents = true;
                    // Se o servidor for encerrado via botão da tela web, fecha o launcher imediatamente na UI thread
                    serverProcess.Exited += (s, e) => {
                        try
                        {
                            if (this.IsHandleCreated)
                            {
                                this.BeginInvoke(new Action(EncerrarTudo));
                                return;
                            }
                        }
                        catch { }
                        EncerrarTudo();
                    };
                }
            }
            catch (Exception ex)
            {
                MessageBox.Show(
                    "Erro ao inicializar o servidor fiscal: " + ex.Message,
                    "Falha de Inicialização",
                    MessageBoxButtons.OK,
                    MessageBoxIcon.Error
                );
                Environment.Exit(1);
                return;
            }

            // Configura o ícone na bandeja do sistema (System Tray)
            trayIcon = new NotifyIcon();
            trayIcon.Text = "Sistema Cupom Fiscal NFC-e";
            trayIcon.Icon = appIcon;
            trayIcon.Visible = true;

            ContextMenu menu = new ContextMenu();

            MenuItem mHeader = new MenuItem("Sistema Cupom Fiscal NFC-e (Mod 65)");
            mHeader.Enabled = false;
            menu.MenuItems.Add(mHeader);

            MenuItem mDev = new MenuItem("Criado e Desenvolvido por GUARÁ SEGURANÇA E INTERNET");
            mDev.Enabled = false;
            menu.MenuItems.Add(mDev);

            menu.MenuItems.Add("-");

            menu.MenuItems.Add("Abrir no Navegador (http://localhost:3000)", (s, e) => {
                Process.Start("http://localhost:3000");
            });

            menu.MenuItems.Add("-");

            MenuItem mExit = new MenuItem("Encerrar Sistema Fiscal", (s, e) => {
                EncerrarTudo();
            });
            menu.MenuItems.Add(mExit);

            trayIcon.ContextMenu = menu;
            trayIcon.DoubleClick += (s, e) => Process.Start("http://localhost:3000");

            trayIcon.ShowBalloonTip(
                3000,
                "Sistema Fiscal NFC-e Online",
                "Desenvolvido por GUARÁ SEGURANÇA E INTERNET.\nClique duas vezes para abrir a tela.",
                ToolTipIcon.Info
            );

            this.FormClosing += (s, e) => {
                EncerrarTudo();
            };

            Application.ApplicationExit += (s, e) => {
                EncerrarTudo();
            };
        }

        private void EncerrarTudo()
        {
            if (isClosing) return;
            isClosing = true;

            try
            {
                if (trayIcon != null)
                {
                    trayIcon.Visible = false;
                    trayIcon.Icon = null;
                    trayIcon.Dispose();
                    trayIcon = null;
                }

                // Permite ao Windows Explorer processar o fechamento imediato do ícone da bandeja
                Application.DoEvents();

                if (serverProcess != null && !serverProcess.HasExited)
                {
                    // Encerra forçadamente a árvore de processos do Node via taskkill
                    try
                    {
                        ProcessStartInfo psiKill = new ProcessStartInfo("taskkill", "/PID " + serverProcess.Id + " /T /F");
                        psiKill.CreateNoWindow = true;
                        psiKill.UseShellExecute = false;
                        Process p = Process.Start(psiKill);
                        p.WaitForExit(1000);
                    }
                    catch { }

                    if (!serverProcess.HasExited)
                    {
                        serverProcess.Kill();
                    }
                }
            }
            catch { }
            finally
            {
                Application.Exit();
                Environment.Exit(0);
            }
        }

        protected override void SetVisibleCore(bool value)
        {
            base.SetVisibleCore(false);
        }

        [STAThread]
        static void Main()
        {
            Application.EnableVisualStyles();
            Application.SetCompatibleTextRenderingDefault(false);
            Application.Run(new MainForm());
        }
    }
}
