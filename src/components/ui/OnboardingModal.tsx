"use client";

import { type AppLocale } from "@/lib/i18n";
import MethodologyModal from "./MethodologyModal";

interface OnboardingModalProps {
  isOpen: boolean;
  locale: AppLocale;
  onClose: () => void;
}

export default function OnboardingModal(props: OnboardingModalProps) {
  return <MethodologyModal {...props} />;
}
