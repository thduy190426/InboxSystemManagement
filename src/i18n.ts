import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

const resources = {
  en: {
    auth: {
      login: {
        title: "Welcome back!",
        subtitle: "Continue managing your customer conversations and teams.",
        emailLabel: "Email",
        emailPlaceholder: "Enter your Email here",
        passwordLabel: "Password",
        passwordPlaceholder: "Enter your password",
        hidePassword: "Hide password",
        showPassword: "Show password",
        rememberLogin: "Remember login",
        loginButton: "Log in",
        loggingIn: "Logging in...",
        or: "Or",
        googleLogin: "Log in with Google",
        facebookLogin: "Log in with Facebook",
        googleLoginFailed: "Google login failed. Please try again.",
        facebookLoginFailed: "Facebook login failed. Please try again.",
        noAccount: "Don't have an account?",
        createNewAccount: "Create a new account"
      },
      register: {
        title: "Create a new account",
        subtitle: "Create an account to start managing your chats today!",
        fullNameLabel: "Full Name",
        fullNamePlaceholder: "Enter your full name here",
        emailLabel: "Email",
        emailPlaceholder: "Enter your Email address here",
        phoneLabel: "Phone Number",
        phonePlaceholder: "Enter your phone number here",
        genderLabel: "Gender",
        genderPlaceholder: "Select your gender",
        genderMale: "Male",
        genderFemale: "Female",
        genderOther: "Other",
        passwordLabel: "Password",
        passwordPlaceholder: "Enter your password here",
        confirmPasswordLabel: "Confirm Password",
        confirmPasswordPlaceholder: "Re-enter your password here",
        hideConfirmPassword: "Hide confirm password",
        showConfirmPassword: "Show confirm password",
        termsStart: "I agree to the",
        termsLink: "Terms of Service",
        termsAnd: "and",
        privacyLink: "Privacy Policy",
        registerButton: "Register",
        registering: "Registering...",
        securityNotice: "Login data is protected by secure authentication.",
        hasAccount: "Already have an account?",
        loginNow: "Log in now",
        errors: {
          checkInfo: "Please check your registration info!",
          genderRequired: "Please select a gender!",
          genderInvalid: "Invalid gender!",
          fullNameRequired: "Please enter your full name!",
          fullNameMin: "Full name must be at least 2 characters!",
          fullNameMax: "Full name cannot exceed 120 characters!",
          fullNamePattern: "Use only letters, spaces, hyphens, or apostrophes!",
          emailRequired: "Please enter your Email!",
          emailMax: "Email cannot exceed 190 characters!",
          emailPattern: "Invalid email format!",
          phonePattern: "Phone number must be 9-15 digits and can start with +!",
          passwordRequired: "Please enter a password!",
          passwordLengthMin: "at least 8 characters",
          passwordLengthMax: "no more than 72 characters",
          passwordNoSpaces: "no spaces",
          passwordLowercase: "lowercase letter",
          passwordUppercase: "uppercase letter",
          passwordNumber: "number",
          passwordSpecial: "special character",
          passwordNeeds: "Password needs",
          confirmPasswordRequired: "Please re-enter your password!",
          confirmPasswordMismatch: "Passwords do not match!"
        }
      }
    }
  },
  vi: {
    auth: {
      login: {
        title: "Chào mừng trở lại!",
        subtitle: "Tiếp tục quản lý hội thoại khách hàng và đội nhóm của bạn.",
        emailLabel: "Email",
        emailPlaceholder: "Nhập Email của bạn tại đây",
        passwordLabel: "Mật khẩu",
        passwordPlaceholder: "Nhập mật khẩu",
        hidePassword: "Ẩn mật khẩu",
        showPassword: "Hiện mật khẩu",
        rememberLogin: "Ghi nhớ đăng nhập",
        loginButton: "Đăng nhập",
        loggingIn: "Đang đăng nhập...",
        or: "Hoặc",
        googleLogin: "Đăng nhập bằng Google",
        facebookLogin: "Đăng nhập bằng Facebook",
        googleLoginFailed: "Đăng nhập bằng Google thất bại. Vui lòng thử lại.",
        facebookLoginFailed: "Đăng nhập bằng Facebook thất bại. Vui lòng thử lại.",
        noAccount: "Chưa có tài khoản?",
        createNewAccount: "Tạo tài khoản mới"
      },
      register: {
        title: "Tạo tài khoản mới",
        subtitle: "Tạo tài khoản để bắt đầu quản lý chat ngay hôm nay!",
        fullNameLabel: "Họ và tên",
        fullNamePlaceholder: "Nhập họ và tên tại đây",
        emailLabel: "Email",
        emailPlaceholder: "Nhập địa chỉ Email tại đây",
        phoneLabel: "Số điện thoại",
        phonePlaceholder: "Nhập số điện thoại tại đây",
        genderLabel: "Giới tính",
        genderPlaceholder: "Chọn giới tính của bạn",
        genderMale: "Nam",
        genderFemale: "Nữ",
        genderOther: "Khác",
        passwordLabel: "Mật khẩu",
        passwordPlaceholder: "Nhập mật khẩu tại đây",
        confirmPasswordLabel: "Xác nhận mật khẩu",
        confirmPasswordPlaceholder: "Nhập lại mật khẩu tại đây",
        hideConfirmPassword: "Ẩn mật khẩu xác nhận",
        showConfirmPassword: "Hiện mật khẩu xác nhận",
        termsStart: "Tôi đồng ý với",
        termsLink: "Điều khoản sử dụng",
        termsAnd: "và",
        privacyLink: "Chính sách bảo mật",
        registerButton: "Đăng ký",
        registering: "Đang đăng ký...",
        securityNotice: "Dữ liệu đăng nhập được bảo vệ bằng xác thực bảo mật.",
        hasAccount: "Đã có tài khoản?",
        loginNow: "Đăng nhập",
        errors: {
          checkInfo: "Vui lòng kiểm tra lại thông tin đăng ký!",
          genderRequired: "Vui lòng chọn giới tính!",
          genderInvalid: "Giới tính không hợp lệ!",
          fullNameRequired: "Vui lòng nhập họ và tên!",
          fullNameMin: "Họ và tên phải có ít nhất 2 ký tự!",
          fullNameMax: "Họ và tên không được vượt quá 120 ký tự!",
          fullNamePattern: "Chỉ dùng chữ cái, khoảng trắng, dấu gạch nối hoặc dấu nháy!",
          emailRequired: "Vui lòng nhập Email!",
          emailMax: "Email không được vượt quá 190 ký tự!",
          emailPattern: "Email chưa đúng định dạng!",
          phonePattern: "Số điện thoại phải có 9-15 chữ số và có thể bắt đầu bằng dấu +!",
          passwordRequired: "Vui lòng nhập mật khẩu!",
          passwordLengthMin: "ít nhất 8 ký tự",
          passwordLengthMax: "không quá 72 ký tự",
          passwordNoSpaces: "không chứa khoảng trắng",
          passwordLowercase: "có chữ thường",
          passwordUppercase: "có chữ hoa",
          passwordNumber: "có chữ số",
          passwordSpecial: "có ký tự đặc biệt",
          passwordNeeds: "Mật khẩu cần",
          confirmPasswordRequired: "Vui lòng nhập lại mật khẩu!",
          confirmPasswordMismatch: "Mật khẩu xác nhận không khớp!"
        }
      }
    }
  }
};

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources,
    fallbackLng: 'vi',
    debug: false,
    interpolation: {
      escapeValue: false, 
    }
  });

export default i18n;
