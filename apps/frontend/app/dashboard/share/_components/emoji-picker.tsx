// Isolado num módulo próprio pra permitir import() dinâmico a partir do
// comment-editor — emoji-mart + os dados de emoji só entram no bundle
// quando o usuário de fato abre o seletor.
import Picker from "@emoji-mart/react";
import data from "@emoji-mart/data";

export default function EmojiPicker({ onSelect }: { onSelect: (emoji: string) => void }) {
  return (
    <Picker
      data={data}
      locale="pt"
      theme="light"
      previewPosition="none"
      skinTonePosition="none"
      maxFrequentRows={1}
      onEmojiSelect={(emoji: { native: string }) => onSelect(emoji.native)}
    />
  );
}
