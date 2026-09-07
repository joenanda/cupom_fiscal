using System;
using System.Drawing;
using System.Drawing.Drawing2D;
using System.IO;
using System.Reflection;
using System.Security.Cryptography;
using System.Text;
using System.Windows.Forms;

namespace GuaraSegurancaInternet.Licenciamento
{
    static class Program
    {
        [STAThread]
        static void Main()
        {
            Application.EnableVisualStyles();
            Application.SetCompatibleTextRenderingDefault(false);
            Application.Run(new GeradorForm());
        }
    }

    public class GeradorForm : Form
    {
        private const string MASTER_SECRET = "GuaraSegurancaInternetFiscalNFCe2026SecretKey@Protect!";

        private PictureBox picLogo;
        private Label lblHeaderTitle;
        private Label lblHeaderSubtitle;
        private Label lblMachineId;
        private TextBox txtMachineId;
        private Button btnColarId;
        private Label lblHelpId;

        private GroupBox grpTipo;
        private RadioButton rdoDemo;
        private RadioButton rdoAnual;
        private RadioButton rdoVitalicio;

        private Button btnGerar;
        private Label lblChave;
        private TextBox txtChave;
        private Button btnCopiarChave;
        private Label lblFeedback;

        public GeradorForm()
        {
            this.Text = "Gerador de Licenças Oficiais - GUARÁ SEGURANÇA E INTERNET";
            this.Size = new Size(620, 560);
            this.StartPosition = FormStartPosition.CenterScreen;
            this.FormBorderStyle = FormBorderStyle.FixedDialog;
            this.MaximizeBox = false;
            this.BackColor = Color.FromArgb(15, 23, 42); // Slate 900
            this.ForeColor = Color.White;
            this.Font = new Font("Segoe UI", 9f);

            // Carrega ícone oficial
            try
            {
                Stream iconStream = Assembly.GetExecutingAssembly().GetManifestResourceStream("AppIcon");
                if (iconStream != null)
                {
                    this.Icon = new Icon(iconStream);
                }
                else
                {
                    string localIco = Path.Combine(AppDomain.CurrentDomain.BaseDirectory, "app.ico");
                    if (File.Exists(localIco)) this.Icon = new Icon(localIco);
                }
            }
            catch { }

            InicializarComponentes();
        }

        private void InicializarComponentes()
        {
            // 1. Logotipo no Topo
            picLogo = new PictureBox();
            picLogo.Location = new Point(24, 20);
            picLogo.Size = new Size(56, 56);
            picLogo.SizeMode = PictureBoxSizeMode.Zoom;
            picLogo.BackColor = Color.Transparent;

            try
            {
                Stream logoStream = Assembly.GetExecutingAssembly().GetManifestResourceStream("Logo");
                if (logoStream != null)
                {
                    picLogo.Image = Image.FromStream(logoStream);
                }
                else
                {
                    string localPng = Path.Combine(AppDomain.CurrentDomain.BaseDirectory, "logo.png");
                    if (File.Exists(localPng)) picLogo.Image = Image.FromFile(localPng);
                }
            }
            catch { }
            this.Controls.Add(picLogo);

            // Título
            lblHeaderTitle = new Label();
            lblHeaderTitle.Text = "Gerador de Licenças e Ativação";
            lblHeaderTitle.Font = new Font("Segoe UI", 13f, FontStyle.Bold);
            lblHeaderTitle.ForeColor = Color.FromArgb(56, 189, 248); // Azul Sky
            lblHeaderTitle.Location = new Point(90, 20);
            lblHeaderTitle.Size = new Size(490, 26);
            this.Controls.Add(lblHeaderTitle);

            // Subtítulo Guará
            lblHeaderSubtitle = new Label();
            lblHeaderSubtitle.Text = "GUARÁ SEGURANÇA E INTERNET • Sistema Fiscal NFC-e";
            lblHeaderSubtitle.Font = new Font("Segoe UI", 9f, FontStyle.Bold);
            lblHeaderSubtitle.ForeColor = Color.FromArgb(249, 115, 22); // Laranja oficial Guará
            lblHeaderSubtitle.Location = new Point(90, 48);
            lblHeaderSubtitle.Size = new Size(490, 20);
            this.Controls.Add(lblHeaderSubtitle);

            // Linha divisória
            Panel divider = new Panel();
            divider.Location = new Point(24, 88);
            divider.Size = new Size(556, 1);
            divider.BackColor = Color.FromArgb(51, 65, 85);
            this.Controls.Add(divider);

            // 2. Campo Machine ID
            lblMachineId = new Label();
            lblMachineId.Text = "ID do Computador do Cliente (Machine ID):";
            lblMachineId.Font = new Font("Segoe UI", 9f, FontStyle.Bold);
            lblMachineId.ForeColor = Color.FromArgb(203, 213, 225);
            lblMachineId.Location = new Point(24, 102);
            lblMachineId.Size = new Size(400, 20);
            this.Controls.Add(lblMachineId);

            txtMachineId = new TextBox();
            txtMachineId.Location = new Point(24, 126);
            txtMachineId.Size = new Size(440, 30);
            txtMachineId.BackColor = Color.FromArgb(30, 41, 59);
            txtMachineId.ForeColor = Color.FromArgb(56, 189, 248);
            txtMachineId.Font = new Font("Consolas", 11f, FontStyle.Bold);
            txtMachineId.BorderStyle = BorderStyle.FixedSingle;
            this.Controls.Add(txtMachineId);

            btnColarId = new Button();
            btnColarId.Text = "Colar ID";
            btnColarId.Location = new Point(474, 125);
            btnColarId.Size = new Size(106, 30);
            btnColarId.FlatStyle = FlatStyle.Flat;
            btnColarId.FlatAppearance.BorderColor = Color.FromArgb(71, 85, 105);
            btnColarId.BackColor = Color.FromArgb(51, 65, 85);
            btnColarId.ForeColor = Color.White;
            btnColarId.Font = new Font("Segoe UI", 8.5f, FontStyle.Bold);
            btnColarId.Cursor = Cursors.Hand;
            btnColarId.Click += (s, e) => {
                if (Clipboard.ContainsText())
                {
                    string clip = Clipboard.GetText().Trim().ToUpper();
                    txtMachineId.Text = clip;
                }
            };
            this.Controls.Add(btnColarId);

            lblHelpId = new Label();
            lblHelpId.Text = "O cliente clica em 'Copiar ID' na tela de ativação do sistema dele e lhe envia esse código.";
            lblHelpId.Font = new Font("Segoe UI", 8f);
            lblHelpId.ForeColor = Color.FromArgb(148, 163, 184);
            lblHelpId.Location = new Point(24, 160);
            lblHelpId.Size = new Size(550, 18);
            this.Controls.Add(lblHelpId);

            // 3. Modalidade da Licença
            grpTipo = new GroupBox();
            grpTipo.Text = " Modalidade / Validade da Licença ";
            grpTipo.Font = new Font("Segoe UI", 8.5f, FontStyle.Bold);
            grpTipo.ForeColor = Color.FromArgb(203, 213, 225);
            grpTipo.Location = new Point(24, 186);
            grpTipo.Size = new Size(556, 68);
            this.Controls.Add(grpTipo);

            rdoVitalicio = new RadioButton();
            rdoVitalicio.Text = "Vitalícia / Permanente (Recomendado)";
            rdoVitalicio.Location = new Point(16, 26);
            rdoVitalicio.Size = new Size(240, 24);
            rdoVitalicio.ForeColor = Color.FromArgb(74, 222, 128); // Verde
            rdoVitalicio.Checked = true;
            grpTipo.Controls.Add(rdoVitalicio);

            rdoAnual = new RadioButton();
            rdoAnual.Text = "Anual (365 dias)";
            rdoAnual.Location = new Point(266, 26);
            rdoAnual.Size = new Size(130, 24);
            rdoAnual.ForeColor = Color.FromArgb(56, 189, 248); // Azul
            grpTipo.Controls.Add(rdoAnual);

            rdoDemo = new RadioButton();
            rdoDemo.Text = "Teste (30 dias)";
            rdoDemo.Location = new Point(406, 26);
            rdoDemo.Size = new Size(130, 24);
            rdoDemo.ForeColor = Color.FromArgb(251, 191, 36); // Amarelo
            grpTipo.Controls.Add(rdoDemo);

            // 4. Botão Gerar
            btnGerar = new Button();
            btnGerar.Text = "🔑  GERAR CHAVE DE ATIVAÇÃO";
            btnGerar.Location = new Point(24, 266);
            btnGerar.Size = new Size(556, 42);
            btnGerar.FlatStyle = FlatStyle.Flat;
            btnGerar.FlatAppearance.BorderSize = 0;
            btnGerar.BackColor = Color.FromArgb(37, 99, 235); // Azul Primário
            btnGerar.ForeColor = Color.White;
            btnGerar.Font = new Font("Segoe UI", 10.5f, FontStyle.Bold);
            btnGerar.Cursor = Cursors.Hand;
            btnGerar.Click += BtnGerar_Click;
            this.Controls.Add(btnGerar);

            // 5. Saída da Chave
            lblChave = new Label();
            lblChave.Text = "Chave de Ativação Criptografada:";
            lblChave.Font = new Font("Segoe UI", 9f, FontStyle.Bold);
            lblChave.ForeColor = Color.FromArgb(203, 213, 225);
            lblChave.Location = new Point(24, 324);
            lblChave.Size = new Size(400, 20);
            this.Controls.Add(lblChave);

            txtChave = new TextBox();
            txtChave.Location = new Point(24, 348);
            txtChave.Size = new Size(556, 75);
            txtChave.Multiline = true;
            txtChave.ReadOnly = true;
            txtChave.BackColor = Color.FromArgb(15, 20, 30);
            txtChave.ForeColor = Color.FromArgb(74, 222, 128); // Verde
            txtChave.Font = new Font("Consolas", 8.5f);
            txtChave.BorderStyle = BorderStyle.FixedSingle;
            txtChave.ScrollBars = ScrollBars.Vertical;
            this.Controls.Add(txtChave);

            btnCopiarChave = new Button();
            btnCopiarChave.Text = "📋  Copiar Chave para Enviar ao Cliente";
            btnCopiarChave.Location = new Point(24, 434);
            btnCopiarChave.Size = new Size(556, 38);
            btnCopiarChave.FlatStyle = FlatStyle.Flat;
            btnCopiarChave.FlatAppearance.BorderSize = 0;
            btnCopiarChave.BackColor = Color.FromArgb(16, 185, 129); // Verde Sucesso
            btnCopiarChave.ForeColor = Color.White;
            btnCopiarChave.Font = new Font("Segoe UI", 9.5f, FontStyle.Bold);
            btnCopiarChave.Cursor = Cursors.Hand;
            btnCopiarChave.Enabled = false;
            btnCopiarChave.Click += BtnCopiarChave_Click;
            this.Controls.Add(btnCopiarChave);

            lblFeedback = new Label();
            lblFeedback.Text = "";
            lblFeedback.Font = new Font("Segoe UI", 8.5f, FontStyle.Bold);
            lblFeedback.ForeColor = Color.FromArgb(74, 222, 128);
            lblFeedback.Location = new Point(24, 480);
            lblFeedback.Size = new Size(556, 24);
            lblFeedback.TextAlign = ContentAlignment.MiddleCenter;
            this.Controls.Add(lblFeedback);
        }

        private void BtnGerar_Click(object sender, EventArgs e)
        {
            string machineId = txtMachineId.Text.Trim().ToUpper();

            if (string.IsNullOrEmpty(machineId))
            {
                MessageBox.Show(
                    "Por favor, informe o Machine ID do computador do cliente.",
                    "ID Obrigatório",
                    MessageBoxButtons.OK,
                    MessageBoxIcon.Warning
                );
                txtMachineId.Focus();
                return;
            }

            string tipo = "VITALICIA";
            string descTipo = "Vitalícia / Permanente (Sem Expiração)";
            string dataExpiracao = null;
            DateTime agora = DateTime.Now;

            if (rdoDemo.Checked)
            {
                tipo = "DEMO_30D";
                DateTime exp = agora.AddDays(30);
                dataExpiracao = exp.ToString("yyyy-MM-dd");
                descTipo = "Demonstração (Expira em: " + exp.ToString("dd/MM/yyyy") + ")";
            }
            else if (rdoAnual.Checked)
            {
                tipo = "ANUAL_365D";
                DateTime exp = agora.AddDays(365);
                dataExpiracao = exp.ToString("yyyy-MM-dd");
                descTipo = "Assinatura Anual (Expira em: " + exp.ToString("dd/MM/yyyy") + ")";
            }

            string dataEmissao = agora.ToString("yyyy-MM-dd");
            string expString = dataExpiracao != null ? dataExpiracao : "LIFETIME";
            string dadosParaAssinar = string.Format("{0}|{1}|{2}", machineId, tipo, expString);

            // Criptografia HMAC-SHA256
            string assinatura;
            using (HMACSHA256 hmac = new HMACSHA256(Encoding.UTF8.GetBytes(MASTER_SECRET)))
            {
                byte[] hash = hmac.ComputeHash(Encoding.UTF8.GetBytes(dadosParaAssinar));
                StringBuilder sb = new StringBuilder();
                foreach (byte b in hash) sb.Append(b.ToString("x2"));
                assinatura = sb.ToString();
            }

            // Payload JSON
            string json = string.Format(
                "{{\"machineId\":\"{0}\",\"tipo\":\"{1}\",\"dataEmissao\":\"{2}\",\"dataExpiracao\":{3},\"assinatura\":\"{4}\"}}",
                machineId,
                tipo,
                dataEmissao,
                dataExpiracao != null ? "\"" + dataExpiracao + "\"" : "null",
                assinatura
            );

            string base64 = Convert.ToBase64String(Encoding.UTF8.GetBytes(json));
            string chaveFinal = "GUARA-ACT-" + base64;

            txtChave.Text = chaveFinal;
            btnCopiarChave.Enabled = true;

            // Já copia direto para a área de transferência
            try
            {
                Clipboard.SetText(chaveFinal);
                lblFeedback.Text = string.Format("✓ Chave gerada para {0} ({1}) e copiada para a Área de Transferência!", machineId, descTipo);
            }
            catch
            {
                lblFeedback.Text = string.Format("✓ Chave gerada com sucesso! Modalidade: {0}", descTipo);
            }
        }

        private void BtnCopiarChave_Click(object sender, EventArgs e)
        {
            if (!string.IsNullOrEmpty(txtChave.Text))
            {
                try
                {
                    Clipboard.SetText(txtChave.Text);
                    lblFeedback.Text = "✓ Chave copiada com sucesso! Basta colar no WhatsApp ou e-mail do cliente.";
                }
                catch { }
            }
        }
    }
}
