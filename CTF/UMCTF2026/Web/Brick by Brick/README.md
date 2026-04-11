# **Brick by Brick**

> This write-up documents a deliberately vulnerable lab / CTF-style service.  
> All techniques are presented for educational purposes only.

---

## Overview

- **Category**: Web
- **Difficulty**: Easy
- **Key Concepts**:  Directory Enumeration
- **Goal**: Find the hidden admin dashboard and retrieve the flag.

---

## Challenge Description

> ​	I found this old portal for BrickWorks Co. They say their internal systems are secure, but I'm not so sure. Can you find the hidden admin dashboard and get the flag?

---

## Analysis

### Initial Observation
​	The homepage did not contain any obvious vulnerabilities or links. By utilizing directory enumeration, I checked the `/robots.txt` file. This file revealed a hidden directory and several text files. Reading `/internal-docs/it-onboarding.txt` exposed an internal parameter used for file inclusion. By exploiting this parameter, I was able to read the source code of `config.php`, which in turn leaked the path to the hidden admin dashboard (`/dashboard-admin.php`) where the flag was located.

---

### Root Cause / Weakness
​	The application suffers from **Arbitrary File Read / Local File Inclusion (LFI)** and **Information Disclosure**. The web server relies on `robots.txt` to hide sensitive internal documents (Security by Obscurity). Furthermore, the `?file=` parameter mentioned in the internal docs fails to sanitize or validate user input, allowing attackers to read the source code of any file on the server, including configuration files containing sensitive paths and credentials.

---

## Key Concepts

### Information Disclosure (Robots.txt)
​	`robots.txt` is a public file used to instruct legitimate web crawlers (like Googlebot) on which pages they should or shouldn't index. However, developers often mistakenly use it to hide sensitive directories. Attackers routinely check this file as a primary reconnaissance step to discover hidden paths and internal structure.
### Arbitrary File Read / Local File Inclusion (LFI)
​	This vulnerability occurs when a web application reads or includes a file based on unvalidated user input. In this scenario, the application blindly processes the input supplied to the `?file=` parameter. Instead of just serving intended documents, it allows an attacker to retrieve back-end source code (like `.php` files) that would normally be executed by the server rather than displayed to the user.

---

## Exploitation / Solution

### Step 1 – Reconnaissance via `robots.txt`

​	Since the homepage contained no useful information, I started looking for hidden paths. 
![](imgs\home.png)
Checking `robots.txt` revealed several disallowed internal documents:

```python
//robots.txt

User-agent: *
Disallow: /internal-docs/assembly-guide.txt
Disallow: /internal-docs/it-onboarding.txt
Disallow: /internal-docs/q3-report.txt

# NOTE: Maintenance in progress.
# Unauthorized crawling of /internal-docs/ is prohibited.
```

### Step 2 – Discovering the File Read Vulnerability

​	I accessed the restricted file `/internal-docs/it-onboarding.txt`, which provided crucial information about the internal infrastructure:

```
///it-onboarding.txt
----------------------------------------------------------------
SECTION 1 - DOCUMENT PORTAL
----------------------------------------------------------------

The internal document portal lives at our main intranet address.
Staff can access any file using the ?file= parameter:

----------------------------------------------------------------
SECTION 2 - ADMIN DASHBOARD
----------------------------------------------------------------

Credentials are stored in the application config file
for reference by the IT team. See config.php in the web root.
```

​	This document explicitly states that files can be accessed using the `?file=` parameter and points to a sensitive file: `config.php`.

### Step 3 – Exploiting Arbitrary File Read to Extract the Flag

Using the discovered `?file=` parameter, I requested the source code of `config.php`:

```
//config.php

// BrickWorks Co. — Application Configuration
// WARNING: Do not expose this file publicly!

// The admin dashboard is located at /dashboard-admin.php.

// Database
define('DB_HOST', 'localhost');
define('DB_NAME', 'brickworks');
define('DB_USER', 'brickworks_app');
define('DB_PASS', 'Br1ckW0rks_db_2024!');

// WARNING: SYSTEM IS CURRENTLY USING DEFAULT FACTORY CREDENTIALS.
// TODO: Change 'administrator' account from default password.

define('ADMIN_USER', 'administrator');
define('ADMIN_PASS', '[deleted it for safety reasons - Tom]');

// App settings
define('APP_ENV', 'production');
define('APP_DEBUG', false);
define('APP_VERSION', '1.0.3');
```

Finally, knowing the hidden admin dashboard is at `/dashboard-admin.php`, I used the file read vulnerability one last time to read its source code and retrieve the flag:

```
//dashboard-admin.php
// Default credentials - intentionally weak for CTF
define('DASHBOARD_USER', 'administrator');
define('DASHBOARD_PASS', 'administrator');
define('FLAG', 'UMASS{4lw4ys_ch4ng3_d3f4ult_cr3d3nt14ls}');
```

![](imgs\flag.png)

- ## Key Takeaways

  - **Security by Obscurity is not secure:** Never rely on `robots.txt` to protect sensitive files or directories. Implement proper authentication and access controls.
  - **Always validate user input:** Parameters that handle file paths (like `?file=`) must strictly whitelist allowed files and sanitize input to prevent Arbitrary File Read or Path Traversal vulnerabilities.
  - **Protect sensitive configurations:** Never hardcode credentials, secrets, or internal paths in plaintext configuration files that could be exposed by application logic flaws.

  ## References

  - [OWASP - Testing for Local File Inclusion](https://owasp.org/www-project-web-security-testing-guide/v42/4-Web_Application_Security_Testing/07-Input_Validation_Testing/11.1-Testing_for_Local_File_Inclusion)