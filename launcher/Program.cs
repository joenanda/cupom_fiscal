using System;
using System.Diagnostics;
using System.IO;
using System.Threading;
using System.Windows.Forms;

namespace SistemaCupomFiscal
{
    public class MainForm : Form
    {
        private Process serverProcess = null;
        private NotifyIcon trayIcon = null;

        public MainForm()
        {
            this.Text = "Sistema Cupom Fiscal NFC-e";
            this.WindowState = FormWindowState.Minimized;
            this.ShowInTaskbar = false;
            this.FormBorderStyle = FormBorderStyle.FixedToolWindow;
            this.Width = 0;
            this.Height = 0;

            string appDir = AppDomain.CurrentDomain.BaseDirectory;

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

            // Configura o ícone na barra de tarefas / bandeja do sistema (System Tray)
            trayIcon = new NotifyIcon();
            trayIcon.Text = "Sistema Cupom Fiscal NFC-e (Mod 65)";
            trayIcon.Icon = System.Drawing.SystemIcons.Shield;
            trayIcon.Visible = true;

            ContextMenu menu = new ContextMenu();
            menu.MenuItems.Add("Abrir no Navegador (http://localhost:3000)", (s, e) => {
                Process.Start("http://localhost:3000");
            });
            menu.MenuItems.Add("-");
            menu.MenuItems.Add("Encerrar Sistema Fiscal", (s, e) => {
                this.Close();
            });
            trayIcon.ContextMenu = menu;
            trayIcon.DoubleClick += (s, e) => Process.Start("http://localhost:3000");

            trayIcon.ShowBalloonTip(
                3000,
                "Sistema Fiscal NFC-e Online",
                "O sistema está pronto. Clique duas vezes neste ícone para abrir a tela.",
                ToolTipIcon.Info
            );

            this.FormClosing += (s, e) => {
                try
                {
                    if (trayIcon != null)
                    {
                        trayIcon.Visible = false;
                        trayIcon.Dispose();
                    }

                    if (serverProcess != null && !serverProcess.HasExited)
                    {
                        serverProcess.Kill();
                    }
                }
                catch { }
            };
        }

        protected override void SetVisibleCore(bool value)
        {
            // Impede que o form invisível apareça na tela inicial
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
