import { useCallback, useEffect, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";

export type TestRouteView = "setup" | "test" | "result";

function normalizePath(pathname: string) {
  return pathname.length > 1 ? pathname.replace(/\/+$/, "") : pathname;
}

export function useTestRoute({
  basePath,
  view,
  onReturnToSetup,
}: {
  basePath: string;
  view: TestRouteView;
  onReturnToSetup: () => void;
}) {
  const location = useLocation();
  const navigate = useNavigate();
  const returnCallbackRef = useRef(onReturnToSetup);
  const pendingViewRef = useRef<TestRouteView | null>(null);

  useEffect(() => {
    returnCallbackRef.current = onReturnToSetup;
  }, [onReturnToSetup]);

  useEffect(() => {
    const pathname = normalizePath(location.pathname);
    const setupPath = basePath;
    const testPath = `${basePath}/test`;
    const resultPath = `${basePath}/result`;
    const routeView: TestRouteView | null =
      pathname === setupPath
        ? "setup"
        : pathname === testPath
          ? "test"
          : pathname === resultPath
            ? "result"
            : null;

    if (pendingViewRef.current !== null) {
      if (routeView === pendingViewRef.current) {
        pendingViewRef.current = null;
      }
      return;
    }

    if (routeView === "setup") {
      if (view !== "setup") returnCallbackRef.current();
      return;
    }

    if (routeView === "test") {
      if (view === "setup") navigate(setupPath, { replace: true });
      if (view === "result") navigate(resultPath, { replace: true });
      return;
    }

    if (routeView === "result") {
      if (view !== "result") navigate(setupPath, { replace: true });
      return;
    }

    navigate(setupPath, { replace: true });
  }, [basePath, location.pathname, navigate, view]);

  const beginTestRoute = useCallback(
    (replace = false) => {
      pendingViewRef.current = "test";
      navigate(`${basePath}/test`, { replace });
    },
    [basePath, navigate],
  );

  const completeTestRoute = useCallback(
    () => {
      pendingViewRef.current = "result";
      navigate(`${basePath}/result`, { replace: true });
    },
    [basePath, navigate],
  );

  const returnToSetupRoute = useCallback(() => {
    pendingViewRef.current = "setup";
    returnCallbackRef.current();
    navigate(basePath, { replace: true });
  }, [basePath, navigate]);

  return { beginTestRoute, completeTestRoute, returnToSetupRoute };
}
