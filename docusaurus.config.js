import versions from "./versions.json";
import redirects from "./old_site_redirects.js";
import captionedCode from "./src/remark/captioned-code.js";
import tabBlocks from "docusaurus-remark-plugin-tab-blocks";
import fs from "fs";
import fsPromises from "fs/promises";
import path from "path";

import { themes as prismThemes } from "prism-react-renderer";

const organizationName = "pantsbuild";
const projectName = "pantsbuild.org";

function getCurrentVersion() {
  const lastReleasedVersion = versions[0];
  const version = parseInt(lastReleasedVersion.replace("2.", ""), 10);
  return `2.${version + 1}`;
}

// Controls for how much to build:
//  - (No env vars set) -> Just uses the docs from `/docs/` (Docusaurus calls this "current version"), and no blog.
//  - PANTSBUILD_ORG_INCLUDE_VERSIONS=<version>,<version> -> Use current version and versions specified
//  - PANTSBUILD_ORG_INCLUDE_BLOG=1 -> Include the blog.
// Note that `NODE_ENV === 'production' builds _everything_.
const isDev = process.env.NODE_ENV === "development";
const disableVersioning =
  isDev && process.env.PANTSBUILD_ORG_INCLUDE_VERSIONS === undefined;
const onlyIncludeVersions = isDev
  ? process.env.PANTSBUILD_ORG_INCLUDE_VERSIONS
    ? ["current"].concat(
        (process.env.PANTSBUILD_ORG_INCLUDE_VERSIONS || "").split(",")
      )
    : ["current"]
  : undefined;
const currentVersion = getCurrentVersion();
const includeBlog = process.env.PANTSBUILD_ORG_INCLUDE_BLOG === "1" || !isDev;

const formatCopyright = () => {
  const makeLink = (href, text) => `<a href="${href}">${text}</a>`;

  const repoUrl = `https://github.com/${organizationName}/${projectName}`;
  const repoLink = makeLink(repoUrl, "Website source");

  // Only set by CI, so fallback to just `local` for local dev
  const docsCommit = process.env.GITHUB_SHA;
  const commitLink = docsCommit
    ? makeLink(`${repoUrl}/commit/${docsCommit}`, docsCommit.slice(0, 6))
    : "local";

  return `Copyright © Pants project contributors. ${repoLink} @ ${commitLink}.`;
};

const isPrerelease = (version) => {
  const reference_dir = path.join(
    "versioned_docs",
    `version-${version}`,
    "reference"
  );
  const helpAll = JSON.parse(
    fs.readFileSync(path.join(reference_dir, "help-all.json"), "utf8")
  );

  const pantsVersion = helpAll["scope_to_help_info"][""]["advanced"].find(
    (help) => help["config_key"] === "pants_version"
  );

  const hardcoded = pantsVersion["value_history"]["ranked_values"].find(
    (value) => value["rank"] == "HARDCODED"
  );

  // Check if it's one of xx.xx.0.dev0, xx.xx.0a0, xx.xx.0b0,  xx.xx.0rc0, etc.
  // We don't treat patch versions pre-releases as pre-releases, since it looks weird.
  // Optimally we shouldn't sync those either way, but some have ended up here by accident.
  const rex = /^(\d+\.\d+\.0)(\.dev|a|b|rc)\d+$/;

  return rex.test(hardcoded["value"]);
};

const config = {
  title: "Pantsbuild",
  tagline: "The ergonomic build system",
  favicon: "img/favicon.ico",

  url: "https://www.pantsbuild.org",
  baseUrl: "/",
  trailingSlash: false,

  organizationName,
  projectName,

  // @TODO: This should throw on prod
  onBrokenLinks: isDev ? "warn" : "warn",
  onBrokenMarkdownLinks: isDev ? "warn" : "warn",

  webpack: {
    jsLoader: (isServer) => ({
      loader: require.resolve("swc-loader"),
      options: {
        jsc: {
          parser: {
            syntax: "ecmascript",
            tsx: false,
            jsx: true,
          },
          transform: {
            react: {
              runtime: "automatic",
            },
          },
          target: "es2017",
        },
        module: {
          type: isServer ? "commonjs" : "es6",
        },
      },
    }),
  },

  clientModules: ["./src/js/redirectCodeFragment.js"],
  presets: [
    [
      "@docusaurus/preset-classic",
      {
        gtag: {
          trackingID: "G-SEHBXJRF42",
          anonymizeIP: true,
        },
        debug: process.env.NODE_ENV !== "production",
        docs: false, // NB: See `docsPluginWithTopLevel404.js` reference below
        blog: includeBlog && {
          showReadingTime: true,
          editUrl: `https://github.com/${organizationName}/${projectName}/edit/main/`,
          remarkPlugins: [captionedCode, tabBlocks],
          blogSidebarTitle: "All posts",
          blogSidebarCount: "ALL",
          postsPerPage: "ALL",
        },
        theme: {
          customCss: require.resolve("./src/css/custom.css"),
        },
      },
    ],
  ],

  themeConfig: {
    image: "img/social-card.png",
    navbar: {
      title: "Pantsbuild",
      logo: {
        alt: "My Site Logo",
        src: "img/logo.svg",
      },
      items: [
        {
          type: "docSidebar",
          position: "left",
          sidebarId: "docsSidebar",
          label: "Docs",
        },
        {
          type: "docSidebar",
          position: "left",
          sidebarId: "referenceSidebar",
          label: "Reference",
        },
        { to: "/blog", label: "Blog", position: "left" },
        { to: "/sponsorship", label: "Sponsor", position: "left" },
        // Right
        {
          type: "docsVersionDropdown",
          position: "right",
          dropdownActiveClassDisabled: true,
          dropdownItemsAfter: [
            { type: "html", value: '<hr class="dropdown-separator">' },
            { to: "/versions", label: "All Versions" },
          ],
        },
        {
          type: "dropdown",
          label: "Slack",
          position: "right",
          items: [
            {
              label: "Workspace",
              href: "https://pantsbuild.slack.com",
            },
            {
              label: "Workspace Invite",
              href: "https://docs.google.com/forms/d/e/1FAIpQLSf9zgf-MXRnVDJbrVEST3urqneq7LCcy0zw8qU-GH4hPMn52A/viewform?usp=sf_link",
            },
            {
              label: "Linen Mirror",
              href: "https://chat.pantsbuild.org",
            },
          ],
        },
        {
          href: "https://github.com/pantsbuild/pants",
          label: "GitHub",
          position: "right",
        },
        {
          type: "search",
          position: "right",
        },
      ],
    },
    footer: {
      style: "dark",
      links: [
        {
          title: "Spotlight",
          items: [
            {
              label: "Users",
              to: "/spotlight/users",
            },
            {
              label: "Testimonials",
              to: "/spotlight/testimonials",
            },
            {
              label: "Who's Hiring?",
              to: "/spotlight/jobs",
            },
            {
              label: "Media",
              to: "/spotlight/media",
            },
            {
              label: "Service Providers",
              to: "/spotlight/service-providers",
            },
          ],
        },
        {
          title: "Connect",
          items: [
            {
              label: "GitHub",
              href: "https://github.com/pantsbuild/pants",
            },
            {
              label: "Twitter",
              href: "https://twitter.com/pantsbuild",
            },
            {
              label: "YouTube",
              href: "https://www.youtube.com/@pantsbuild",
            },
            {
              label: "Mailing List",
              href: "https://groups.google.com/forum/#!forum/pants-devel",
            },
          ],
        },
        {
          title: "More",
          items: [
            {
              label: "Blog",
              to: "/blog",
            },
            {
              label: "Sponsor",
              href: "/sponsorship",
            },
          ],
        },
        {
          title: "Community",
          items: [
            {
              label: "Members",
              href: "/community/members",
            },
            {
              label: "Code of Conduct",
              href: "/community/code-of-conduct",
            },
            {
              label: "Meet the Team",
              href: "/community/meet-the-team",
            },
            {
              label: "Maintainers",
              href: "/community/maintainers",
            },
            {
              label: "Contentious Decisions",
              href: "/community/contentious-decisions",
            },
          ],
        },
      ],
      copyright: formatCopyright(),
    },
    algolia: {
      appId: "QD9KY1TRVK",
      apiKey: "487e5f50fad326e6126bf593c06b3310",
      indexName: "pantsbuild",
      contextualSearch: true,
    },
    prism: {
      additionalLanguages: [
        "bash",
        "docker",
        "go",
        "ini",
        "java",
        "json",
        "log",
        "protobuf",
        "python",
        "shell-session",
        "toml",
        // TODO: Add thrift once supported: https://github.com/PrismJS/prism/issues/3641
      ],
      // NB: Not all themes support shell-session well. Check before you change this.
      theme: prismThemes.palenight,
      darkTheme: prismThemes.nightOwl,
    },
  },
  plugins: [
    [
      "./src/js/docsPluginWithTopLevel404.js",
      {
        sidebarPath: require.resolve("./sidebars.js"),
        routeBasePath: "/",
        disableVersioning,
        onlyIncludeVersions,
        lastVersion: onlyIncludeVersions
          ? undefined
          : versions.find((v) => !isPrerelease(v)),
        versions: {
          current: {
            label: `${currentVersion} (dev)`,
            path: currentVersion,
          },
          ...(disableVersioning
            ? {}
            : versions.reduce((acc, version, index) => {
                acc[version] = {
                  label: isPrerelease(version)
                    ? `${version} (prerelease)`
                    : index < 2 + (isPrerelease(versions[0]) ? 1 : 0)
                      ? version
                      : `${version} (deprecated)`,
                  banner: isPrerelease(version)
                    ? "unreleased"
                    : index < 2 + (isPrerelease(versions[0]) ? 1 : 0)
                      ? "none"
                      : "unmaintained",
                  noIndex: index >= 2 + (isPrerelease(versions[0]) ? 1 : 0),
                  path: version,
                };
                return acc;
              }, {})),
        },
        remarkPlugins: [captionedCode, tabBlocks],
        editUrl: ({ docPath }) => {
          if (docPath.startsWith("reference/")) {
            return undefined;
          }
          return `https://github.com/pantsbuild/pants/edit/main/docs/${docPath}`;
        },
      },
    ],
    [
      "@docusaurus/plugin-client-redirects",
      {
        redirects,
      },
    ],
  ],
};

module.exports = config;
