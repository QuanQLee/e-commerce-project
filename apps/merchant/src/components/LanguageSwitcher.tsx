import { FormControl, InputLabel, MenuItem, Select } from '@mui/material'
import type { SelectChangeEvent } from '@mui/material/Select'
import { Language, useI18n } from '../state/i18n'

type Props = {
  size?: 'small' | 'medium'
  fullWidth?: boolean
}

export default function LanguageSwitcher({ size = 'small', fullWidth }: Props) {
  const { language, languages, setLanguage, t } = useI18n()

  const handleChange = (event: SelectChangeEvent<string>) => {
    setLanguage(event.target.value as Language)
  }

  return (
    <FormControl size={size} fullWidth={fullWidth} variant="outlined">
      <InputLabel id="merchant-language-select">{t('nav.language')}</InputLabel>
      <Select
        labelId="merchant-language-select"
        label={t('nav.language')}
        value={language}
        onChange={handleChange}
      >
        {languages.map((item) => (
          <MenuItem key={item.code} value={item.code}>
            {item.label}
          </MenuItem>
        ))}
      </Select>
    </FormControl>
  )
}
